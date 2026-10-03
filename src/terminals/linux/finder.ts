import { posix } from 'node:path';
import type { ResolvedTerminal, TerminalFinder } from '../types';
import type { LinuxTerminalSpec } from './types';
import { LINUX_TERMINALS } from './candidates';
import { queryAlternative } from './alternatives';

export interface LinuxFinderDeps {
  readonly specs: readonly LinuxTerminalSpec[];
  /** Path the Debian alternative `name` points at, or `null` if unknown. */
  readonly queryAlternative: (name: string) => Promise<string | null>;
  readonly debug?: (message: string) => void;
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

function toTerminal(spec: LinuxTerminalSpec): ResolvedTerminal {
  // The bare binary name is resolved against `PATH` by the OS when the
  // terminal is spawned; the plugin never touches the filesystem itself.
  return { id: spec.id, displayName: spec.displayName, binaryPath: spec.binary, extra: { spec } };
}

/**
 * Picks the next terminal to try. Nothing is probed up front: a candidate
 * that turns out to be missing fails to spawn with `ENOENT`, is reported
 * back through `reject()`, and the next candidate is offered.
 */
export class LinuxTerminalFinder implements TerminalFinder {
  private verified: ResolvedTerminal | null = null;
  private currentPreferredId: string | null = null;
  private resolving: Promise<ResolvedTerminal | null> | null = null;
  private readonly rejected = new Set<string>();
  private readonly deps: LinuxFinderDeps;

  constructor(deps?: Partial<LinuxFinderDeps>) {
    this.deps = {
      specs: deps?.specs ?? LINUX_TERMINALS,
      queryAlternative: deps?.queryAlternative ?? queryAlternative,
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

  /** `terminal` could not be started: skip it and offer the next candidate. */
  reject(terminal: ResolvedTerminal): void {
    this.rejected.add(terminal.id);
    this.verified = null;
    this.deps.debug?.(`rejected terminal ${terminal.displayName} (${terminal.binaryPath})`);
  }

  invalidate(): void {
    this.verified = null;
    this.rejected.clear();
  }

  /**
   * Follow a system-default link (e.g. `x-terminal-emulator`) to the
   * terminal it points at. Returns that terminal when it is a supported
   * one, so it is launched with its own working-directory flag; otherwise
   * returns the link itself.
   */
  private async followSystemDefault(link: LinuxTerminalSpec): Promise<LinuxTerminalSpec> {
    const targetPath = await this.deps.queryAlternative(link.binary);
    if (targetPath === null) {
      return link;
    }
    // Debian ships wrappers such as `gnome-terminal.wrapper`.
    const target = posix.basename(targetPath).replace(/\.wrapper$/, '');
    const match = this.deps.specs.find(
      (s) => s.systemDefaultLink !== true && s.binary === target && !this.rejected.has(s.id),
    );
    return match ?? link;
  }

  private async findBest(preferredId: string | null): Promise<ResolvedTerminal | null> {
    const candidates = [...this.deps.specs];

    // The user's preferred terminal is tried first, then the default order
    // (system default first).
    if (preferredId !== null && preferredId !== 'auto' && preferredId !== '') {
      const normalizedPreferred = preferredId.toLowerCase().replace(/^terminal-choice-/, '');
      const match = this.deps.specs.find((s) => matchesPreferredTerminal(s, normalizedPreferred));
      if (match !== undefined) {
        candidates.unshift(match);
      }
    }

    const next = candidates.find((s) => !this.rejected.has(s.id));
    if (next === undefined) {
      // Every candidate failed; start over on the next click.
      this.rejected.clear();
      return null;
    }

    const spec = next.systemDefaultLink === true ? await this.followSystemDefault(next) : next;
    // A followed link is remembered under the link's own id, so a failure
    // rejects the link and does not offer it again.
    this.verified = { ...toTerminal(spec), id: next.id };
    this.deps.debug?.(`trying terminal: ${spec.displayName} (${spec.binary})`);
    return this.verified;
  }
}
