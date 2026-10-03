import type { MacTerminalSpec } from './types';

/** macOS launcher used to start every terminal app. */
export const MAC_OPEN_BINARY = '/usr/bin/open';

/**
 * Directories searched for terminal app bundles, in order. `~/Applications`
 * is appended at runtime by the finder.
 */
export const MAC_APP_DIRS: readonly string[] = [
  '/Applications',
  '/System/Applications/Utilities',
  '/System/Applications',
];

/**
 * Ordered list of supported macOS terminal apps.
 *
 * The built-in Terminal.app comes first so Auto-detect follows the system
 * terminal; Ghostty and Kitty are used when selected as the preferred
 * terminal. NOTE: macOS support has not been verified on a real Mac.
 */
export const MAC_TERMINALS: readonly MacTerminalSpec[] = [
  {
    id: 'terminal',
    displayName: 'Terminal',
    appBundle: 'Terminal.app',
    // Terminal.app opens a new window at a folder passed as a document.
    buildArgs: (appPath, dir) => ['-a', appPath, dir],
  },
  {
    id: 'ghostty',
    displayName: 'Ghostty',
    appBundle: 'Ghostty.app',
    buildArgs: (appPath, dir) => ['-a', appPath, dir],
  },
  {
    id: 'kitty',
    displayName: 'Kitty',
    appBundle: 'kitty.app',
    // `-n` is required: `--args` are dropped when kitty is already running.
    buildArgs: (appPath, dir) => ['-n', '-a', appPath, '--args', '--directory', dir],
  },
] as const;
