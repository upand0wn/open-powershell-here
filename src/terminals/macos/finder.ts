// macOS paths are POSIX paths, so this finder always joins with POSIX
// semantics — even when the test suite runs on Windows.
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { posix } from 'node:path';
import type { ResolvedTerminal, TerminalFinder } from '../types';
import type { MacTerminalSpec } from './types';
import { MAC_APP_DIRS, MAC_OPEN_BINARY, MAC_TERMINALS } from './candidates';

export interface MacFinderDeps {
  readonly specs: readonly MacTerminalSpec[];
  readonly appDirs: readonly string[];
  readonly checkExists: (path: string) => Promise<boolean>;
  readonly env?: NodeJS.ProcessEnv;
  readonly debug?: (message: string) => void;
}

async function defaultCheckExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export class MacTerminalFinder implements TerminalFinder {
  private verified: ResolvedTerminal | null = null;
  private currentPreferredId: string | null = null;
  private resolving: Promise<ResolvedTerminal | null> | null = null;
  private readonly deps: MacFinderDeps;

  constructor(deps?: Partial<MacFinderDeps>) {
    this.deps = {
      specs: deps?.specs ?? MAC_TERMINALS,
      appDirs: deps?.appDirs ?? MAC_APP_DIRS,
      checkExists: deps?.checkExists ?? defaultCheckExists,
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
    this.resolving = this.findBest(this.currentPreferredId).finally(() => {
      this.resolving = null;
    });
    return this.resolving;
  }

  invalidate(): void {
    this.verified = null;
  }

  private searchDirs(): string[] {
    const home = (this.deps.env ?? process.env).HOME;
    const dirs = [...this.deps.appDirs];
    if (home !== undefined && home !== '') {
      dirs.push(posix.join(home, 'Applications'));
    }
    return dirs;
  }

  private async locate(spec: MacTerminalSpec): Promise<ResolvedTerminal | null> {
    for (const dir of this.searchDirs()) {
      const appPath = posix.join(dir, spec.appBundle);
      if (await this.deps.checkExists(appPath)) {
        return {
          id: spec.id,
          displayName: spec.displayName,
          binaryPath: MAC_OPEN_BINARY,
          extra: { spec, appPath },
        };
      }
    }
    return null;
  }

  private async findBest(preferredId: string | null): Promise<ResolvedTerminal | null> {
    // If user has a preferred terminal, attempt to find that one first
    if (preferredId !== null && preferredId !== 'auto' && preferredId !== '') {
      const normalizedPreferred = preferredId.toLowerCase().replace(/^terminal-choice-/, '');
      const match = this.deps.specs.find((s) => s.id === normalizedPreferred);
      if (match !== undefined) {
        const found = await this.locate(match);
        if (found !== null) {
          this.verified = found;
          this.deps.debug?.(`found preferred terminal: ${match.displayName}`);
          return this.verified;
        }
        this.deps.debug?.(`preferred terminal ${match.displayName} not found on system`);
      }
    }

    // Fallback: search all supported candidates in order
    for (const spec of this.deps.specs) {
      const found = await this.locate(spec);
      if (found !== null) {
        this.verified = found;
        this.deps.debug?.(`found terminal: ${spec.displayName}`);
        return this.verified;
      }
      this.deps.debug?.(`rejected terminal ${spec.displayName} (${spec.appBundle})`);
    }

    return null;
  }
}
