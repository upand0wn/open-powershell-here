/**
 * Common types for native terminal finders and launchers across platforms.
 */

/**
 * Outcome of a formal interactive terminal launch. `ENOENT` means the
 * terminal is not installed (the next candidate may be tried).
 */
export type LaunchOutcome =
  | { readonly ok: true; readonly pid: number }
  | { readonly ok: false; readonly code: 'ENOENT' | 'UNKNOWN'; readonly error: Error };

/** Information about a resolved native terminal. */
export interface ResolvedTerminal {
  readonly id: string;
  readonly displayName: string;
  readonly binaryPath: string;
  readonly extra?: Record<string, unknown>;
}

/** Common interface for platform-specific terminal finders. */
export interface TerminalFinder {
  readonly cached: ResolvedTerminal | null;
  resolve(): Promise<ResolvedTerminal | null>;
  invalidate(): void;
  /** Optional: honour the user's preferred terminal (Style Settings). */
  setPreferredTerminal?(id: string | null): void;
  /**
   * Optional: `terminal` could not be started. Finders that implement this
   * skip it and offer the next candidate from `resolve()`, or `null` once
   * every candidate has been rejected.
   */
  reject?(terminal: ResolvedTerminal): void;
}

/** Common interface for platform-specific terminal launchers. */
export interface TerminalLauncher {
  launch(terminal: ResolvedTerminal, targetDir: string): Promise<LaunchOutcome>;
}
