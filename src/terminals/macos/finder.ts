// macOS paths are POSIX paths, so this finder always joins with POSIX
// semantics — even when the test suite runs on Windows.
import { posix } from 'node:path';
import type { ResolvedTerminal, TerminalFinder } from '../types';
import type { MacTerminalSpec } from './types';
import { MAC_APP_DIRS, MAC_OPEN_BINARY, MAC_TERMINALS } from './candidates';

export interface MacFinderDeps {
  readonly specs: readonly MacTerminalSpec[];
  readonly appDirs: readonly string[];
  readonly env?: NodeJS.ProcessEnv;
  readonly debug?: (message: string) => void;
}

/**
 * Picks the next app bundle path to try. Nothing is probed up front:
 * `/usr/bin/open` fails for a bundle that does not exist, the failure is
 * reported back through `reject()`, and the next location is offered.
 */
export class MacTerminalFinder implements TerminalFinder {
  private verified: ResolvedTerminal | null = null;
  private currentPreferredId: string | null = null;
  private resolving: Promise<ResolvedTerminal | null> | null = null;
  private readonly rejected = new Set<string>();
  private readonly deps: MacFinderDeps;

  constructor(deps?: Partial<MacFinderDeps>) {
    this.deps = {
      specs: deps?.specs ?? MAC_TERMINALS,
      appDirs: deps?.appDirs ?? MAC_APP_DIRS,
      env: deps?.env,
      debug: deps?.debug ?? ((msg) => console.debug(`[Native Terminal Here] ${msg}`)),
    };
  }

  get cached(): ResolvedTerminal | null {
    return this.verified;
  }

  setPreferredTerminal(id: string | null): void {
    if (this.currentPreferredId !== id) {
      this.currentPreferredId = id;
      this.invalidate();
    }
  }

  resolve(): Promise<ResolvedTerminal | null> {
    if (this.verified !== null) {
      return Promise.resolve(this.verified);
    }
    if (this.resolving !== null) {
      return this.resolving;
    }
    this.resolving = Promise.resolve(this.findBest(this.currentPreferredId)).finally(() => {
      this.resolving = null;
    });
    return this.resolving;
  }

  /** `terminal` could not be opened: skip it and offer the next candidate. */
  reject(terminal: ResolvedTerminal): void {
    const appPath = terminal.extra?.appPath;
    if (typeof appPath === 'string') {
      this.rejected.add(appPath);
    }
    this.verified = null;
    this.deps.debug?.(`rejected terminal ${terminal.displayName} (${String(appPath)})`);
  }

  invalidate(): void {
    this.verified = null;
    this.rejected.clear();
  }

  private searchDirs(): string[] {
    const home = (this.deps.env ?? process.env).HOME;
    const dirs = [...this.deps.appDirs];
    if (home !== undefined && home !== '') {
      dirs.push(posix.join(home, 'Applications'));
    }
    return dirs;
  }

  private findBest(preferredId: string | null): ResolvedTerminal | null {
    const specs = [...this.deps.specs];

    // The user's preferred terminal is tried first, then the default order.
    if (preferredId !== null && preferredId !== 'auto' && preferredId !== '') {
      const normalizedPreferred = preferredId.toLowerCase().replace(/^terminal-choice-/, '');
      const match = this.deps.specs.find((s) => s.id === normalizedPreferred);
      if (match !== undefined) {
        specs.unshift(match);
      }
    }

    for (const spec of specs) {
      for (const dir of this.searchDirs()) {
        const appPath = posix.join(dir, spec.appBundle);
        if (!this.rejected.has(appPath)) {
          this.verified = {
            id: spec.id,
            displayName: spec.displayName,
            binaryPath: MAC_OPEN_BINARY,
            extra: { spec, appPath },
          };
          this.deps.debug?.(`trying terminal: ${spec.displayName} (${appPath})`);
          return this.verified;
        }
      }
    }

    // Every location failed; start over on the next click.
    this.rejected.clear();
    return null;
  }
}
