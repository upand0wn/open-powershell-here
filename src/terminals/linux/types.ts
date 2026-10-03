/**
 * Specification and types for supported Linux terminal emulators.
 */

export interface LinuxTerminalSpec {
  readonly id: string;
  readonly displayName: string;
  readonly binary: string;
  readonly buildArgs: (targetDir: string) => string[];
  /**
   * Additional identifiers matched against the preferred-terminal setting.
   * Used for legacy Style Settings class values (for example `gnome` and
   * `xfce4`) that predate the full terminal ids.
   */
  readonly aliases?: readonly string[];
  /**
   * The binary is a link to the system default terminal (Debian
   * alternatives); the finder follows it to identify the real terminal.
   */
  readonly systemDefaultLink?: boolean;
}
