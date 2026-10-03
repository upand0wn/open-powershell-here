// This finder only scans POSIX-style Linux `PATH` entries, so it always
// joins with POSIX semantics — even when the test suite runs on Windows.
import { access, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { posix } from 'node:path';
import type { ResolvedTerminal, TerminalFinder } from '../types';
import type { LinuxTerminalSpec } from './types';
import { LINUX_TERMINALS } from './candidates';

export interface LinuxFinderDeps {
  readonly specs: readonly LinuxTerminalSpec[];
  readonly checkExecutable: (path: string) => Promise<boolean>;
  readonly resolveRealPath: (path: string) => Promise<string | null>;
  readonly env?: NodeJS.ProcessEnv;
  readonly debug?: (message: string) => void;
}

async function defaultCheckExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function defaultResolveRealPath(filePath: string): Promise<string | null> {
  try {
    return await realpath(filePath);
  } catch {
    return null;
  }
}

function matchesPreferredTerminal(spec: LinuxTerminalSpec, normalizedPreferred: string): boolean {
  if (spec.id.toLowerCase() === normalizedPreferred) {
    return true;
  }
  if (spec.binary.toLowerCase() === normalizedPreferred) {
    return true;
  }
  return (spec.aliases ?? []).some((alias) => alias.toLowerCase() === normalizedPreferred);
}

export class LinuxTerminalFinder implements TerminalFinder {
  private verified: ResolvedTerminal | null = null;
  private currentPreferredId: string | null = null;
  private resolving: Promise<ResolvedTerminal | null> | null = null;
  private readonly deps: LinuxFinderDeps;

  constructor(deps?: Partial<LinuxFinderDeps>) {
    this.deps = {
      specs: deps?.specs ?? LINUX_TERMINALS,
      checkExecutable: deps?.checkExecutable ?? defaultCheckExecutable,
      resolveRealPath: deps?.resolveRealPath ?? defaultResolveRealPath,
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

  resolve(preferredId?: string | null): Promise<ResolvedTerminal | null> {
    const targetPreferred = preferredId ?? this.currentPreferredId;
    if (targetPreferred !== this.currentPreferredId) {
      this.currentPreferredId = targetPreferred;
      this.invalidate();
    }

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

  private pathDirs(): string[] {
    const pathEnv = (this.deps.env ?? process.env).PATH ?? '';
    return pathEnv.split(':').filter(Boolean);
  }

  private async locate(spec: LinuxTerminalSpec): Promise<ResolvedTerminal | null> {
    for (const dir of this.pathDirs()) {
      const fullPath = posix.join(dir, spec.binary);
      if (await this.deps.checkExecutable(fullPath)) {
        return {
          id: spec.id,
          displayName: spec.displayName,
          binaryPath: fullPath,
          extra: { spec },
        };
      }
    }
    return null;
  }

  /**
   * Follow a system-default link (e.g. `x-terminal-emulator`) to the
   * terminal it points at. Returns that terminal when it is a supported one
   * found on `PATH`, so it is launched with its own working-directory flag;
   * otherwise returns the link itself.
   */
  private async followSystemDefault(link: ResolvedTerminal): Promise<ResolvedTerminal> {
    const realPath = await this.deps.resolveRealPath(link.binaryPath);
    if (realPath === null) {
      return link;
    }
    // Debian ships wrappers such as `gnome-terminal.wrapper`.
    const target = posix.basename(realPath).replace(/\.wrapper$/, '');
    const match = this.deps.specs.find(
      (s) => s.systemDefaultLink !== true && s.binary === target,
    );
    if (match === undefined) {
      return link;
    }
    return (await this.locate(match)) ?? link;
  }

  private async findBest(preferredId?: string | null): Promise<ResolvedTerminal | null> {
    // If user has a preferred terminal, attempt to find that one first
    if (preferredId !== null && preferredId !== undefined && preferredId !== 'auto' && preferredId !== '') {
      const normalizedPreferred = preferredId.toLowerCase().replace(/^terminal-choice-/, '');
      const match = this.deps.specs.find((s) => matchesPreferredTerminal(s, normalizedPreferred));
      if (match !== undefined) {
        const found = await this.locate(match);
        if (found !== null) {
          this.verified = found;
          this.deps.debug?.(`found preferred terminal: ${match.displayName} at ${found.binaryPath}`);
          return this.verified;
        }
        this.deps.debug?.(`preferred terminal ${match.displayName} not found on system`);
      }
    }

    // Fallback: search all supported candidates in order (system default first)
    for (const spec of this.deps.specs) {
      const found = await this.locate(spec);
      if (found !== null) {
        this.verified =
          spec.systemDefaultLink === true ? await this.followSystemDefault(found) : found;
        this.deps.debug?.(
          `found terminal: ${this.verified.displayName} at ${this.verified.binaryPath}`,
        );
        return this.verified;
      }
      this.deps.debug?.(`rejected terminal ${spec.displayName} (${spec.binary})`);
    }

    return null;
  }
}
