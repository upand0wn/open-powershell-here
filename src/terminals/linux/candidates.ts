import type { LinuxTerminalSpec } from './types';

/**
 * Ordered list of supported Linux terminal emulators.
 *
 * Ghostty is prioritized first as recommended by the author. The system
 * default terminal (`xdg-terminal-exec`, the standard mechanism on
 * Ubuntu 25.04+) comes next, followed by popular modern and desktop-native
 * terminal emulators.
 */
export const LINUX_TERMINALS: readonly LinuxTerminalSpec[] = [
  {
    id: 'ghostty',
    displayName: 'Ghostty',
    binary: 'ghostty',
    buildArgs: (dir) => [`--working-directory=${dir}`],
  },
  {
    id: 'xdg-terminal-exec',
    displayName: 'System Default (xdg-terminal-exec)',
    binary: 'xdg-terminal-exec',
    // Resolves the user's configured default terminal and forwards the
    // working directory, e.g. on Ubuntu 26.04 this runs
    // `ptyxis --new-window --working-directory <dir>`.
    buildArgs: (dir) => [`--dir=${dir}`],
  },
  {
    id: 'alacritty',
    displayName: 'Alacritty',
    binary: 'alacritty',
    buildArgs: (dir) => ['--working-directory', dir],
  },
  {
    id: 'kitty',
    displayName: 'Kitty',
    binary: 'kitty',
    buildArgs: (dir) => ['--directory', dir],
  },
  {
    id: 'wezterm',
    displayName: 'WezTerm',
    binary: 'wezterm',
    buildArgs: (dir) => ['start', '--cwd', dir],
  },
  {
    id: 'konsole',
    displayName: 'Konsole',
    binary: 'konsole',
    buildArgs: (dir) => ['--workdir', dir],
  },
  {
    id: 'ptyxis',
    displayName: 'Ptyxis',
    binary: 'ptyxis',
    // `--new-window` is required so an already running Ptyxis instance opens
    // a new window at the target directory instead of focusing an existing
    // window and dropping the working directory.
    buildArgs: (dir) => ['--new-window', `--working-directory=${dir}`],
  },
  {
    id: 'gnome-terminal',
    displayName: 'GNOME Terminal',
    binary: 'gnome-terminal',
    buildArgs: (dir) => [`--working-directory=${dir}`],
    aliases: ['gnome'],
  },
  {
    id: 'kgx',
    displayName: 'GNOME Console',
    binary: 'kgx',
    buildArgs: (dir) => [`--working-directory=${dir}`],
    aliases: ['gnome-console'],
  },
  {
    id: 'xfce4-terminal',
    displayName: 'XFCE4 Terminal',
    binary: 'xfce4-terminal',
    buildArgs: (dir) => [`--working-directory=${dir}`],
    aliases: ['xfce4'],
  },
  {
    id: 'foot',
    displayName: 'Foot',
    binary: 'foot',
    buildArgs: (dir) => ['-D', dir],
  },
  {
    id: 'x-terminal-emulator',
    displayName: 'Terminal',
    binary: 'x-terminal-emulator',
    buildArgs: () => [],
  },
] as const;
