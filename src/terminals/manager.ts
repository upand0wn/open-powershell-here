import type { LaunchOutcome, ResolvedTerminal, TerminalFinder } from './types';
import { PowerShellFinder } from './windows/finder';
import { launchInteractive as launchWindowsInteractive } from './windows/launcher';
import type { VerifiedPowerShell } from './windows/types';
import { LinuxTerminalFinder } from './linux/finder';
import { launchLinuxTerminal } from './linux/launcher';
import { MacTerminalFinder } from './macos/finder';
import { launchMacTerminal } from './macos/launcher';

export type TerminalLaunchResult =
  | { readonly kind: 'success' }
  | { readonly kind: 'unsupported_platform'; readonly platform: string }
  | { readonly kind: 'no_target_path' }
  | { readonly kind: 'semicolon_in_path' }
  | { readonly kind: 'not_found'; readonly platform: string }
  | { readonly kind: 'failed'; readonly error?: Error };

export interface TerminalManagerDeps {
  readonly platform: NodeJS.Platform;
  readonly finder?: TerminalFinder;
  readonly launch?: (terminal: ResolvedTerminal, targetDir: string) => Promise<LaunchOutcome>;
}

/** Upper bound on launch attempts per click (candidates are far fewer). */
const MAX_LAUNCH_ATTEMPTS = 32;

export class TerminalManager {
  readonly platform: NodeJS.Platform;
  readonly finder: TerminalFinder | null;
  private readonly launcher: ((terminal: ResolvedTerminal, targetDir: string) => Promise<LaunchOutcome>) | null;
  private explicitPreferredTerminal: string | null = null;

  constructor(deps?: Partial<TerminalManagerDeps>) {
    this.platform = deps?.platform ?? process.platform;

    if (deps?.finder !== undefined) {
      this.finder = deps.finder;
    } else if (this.platform === 'win32') {
      this.finder = new PowerShellFinder();
    } else if (this.platform === 'linux') {
      this.finder = new LinuxTerminalFinder();
    } else if (this.platform === 'darwin') {
      this.finder = new MacTerminalFinder();
    } else {
      this.finder = null;
    }

    if (deps?.launch !== undefined) {
      this.launcher = deps.launch;
    } else if (this.platform === 'win32') {
      this.launcher = (term, dir) => {
        const verified: VerifiedPowerShell = {
          path: term.binaryPath,
          majorVersion: (term.extra?.majorVersion as number) ?? 7,
        };
        return launchWindowsInteractive(verified, dir);
      };
    } else if (this.platform === 'linux') {
      this.launcher = (term, dir) => launchLinuxTerminal(term, dir);
    } else if (this.platform === 'darwin') {
      this.launcher = (term, dir) => launchMacTerminal(term, dir);
    } else {
      this.launcher = null;
    }
  }

  isPlatformSupported(): boolean {
    return this.platform === 'win32' || this.platform === 'linux' || this.platform === 'darwin';
  }

  getMenuTitle(): string {
    return 'Open Terminal here';
  }

  getRibbonTooltip(): string {
    return 'Open Terminal at vault root';
  }

  setPreferredTerminal(id: string | null): void {
    this.explicitPreferredTerminal = id;
    this.finder?.setPreferredTerminal?.(id);
  }

  detectPreferredTerminalFromDom(): string | null {
    if (this.explicitPreferredTerminal !== null) {
      return this.explicitPreferredTerminal;
    }
    if (typeof document === 'undefined') {
      return null;
    }
    const classList = document.body.classList;
    for (const cls of Array.from(classList)) {
      if (cls.startsWith('terminal-choice-') && cls !== 'terminal-choice-auto') {
        return cls.replace('terminal-choice-', '');
      }
    }
    return null;
  }

  async launch(targetDir: string | null, preferredTerminal?: string | null): Promise<TerminalLaunchResult> {
    if (!this.isPlatformSupported() || this.finder === null || this.launcher === null) {
      return { kind: 'unsupported_platform', platform: this.platform };
    }

    if (targetDir === null) {
      return { kind: 'no_target_path' };
    }

    if (this.platform === 'win32' && targetDir.includes(';')) {
      return { kind: 'semicolon_in_path' };
    }

    const preferred = preferredTerminal ?? this.detectPreferredTerminalFromDom();
    this.finder.setPreferredTerminal?.(preferred);

    let verified = await this.finder.resolve();
    for (let attempt = 0; attempt < MAX_LAUNCH_ATTEMPTS; attempt++) {
      if (verified === null) {
        return { kind: 'not_found', platform: this.platform };
      }

      const outcome = await this.launcher(verified, targetDir);
      if (outcome.ok) {
        return { kind: 'success' };
      }
      if (outcome.code !== 'ENOENT') {
        return { kind: 'failed', error: outcome.error };
      }

      if (this.finder.reject !== undefined) {
        // Linux / macOS: the candidate is not installed, move on to the next.
        this.finder.reject(verified);
      } else if (attempt === 0) {
        // Windows: the cached terminal went away, re-verify and retry once.
        this.finder.invalidate();
      } else {
        return { kind: 'failed', error: outcome.error };
      }
      verified = await this.finder.resolve();
    }

    return { kind: 'not_found', platform: this.platform };
  }
}
