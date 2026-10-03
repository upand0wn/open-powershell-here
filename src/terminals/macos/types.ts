/**
 * Specification and types for supported macOS terminal apps.
 */

export interface MacTerminalSpec {
  readonly id: string;
  readonly displayName: string;
  /** App bundle name, e.g. `Terminal.app`. */
  readonly appBundle: string;
  /** Arguments for `/usr/bin/open`, given the resolved bundle path. */
  readonly buildArgs: (appPath: string, targetDir: string) => string[];
}
