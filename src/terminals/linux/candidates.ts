import type { LinuxTerminalSpec } from './types';

/**
 * Ordered list of supported Linux terminal emulators.
 *
 * No terminal is favoured: the system default comes first
 * (`xdg-terminal-exec`, the standard mechanism on Ubuntu 25.04+, then the
 * Debian `x-terminal-emulator` alternative), followed by every individually
 * supported terminal in alphabetical order as a neutral fallback.
 */
export const LINUX_TERMINALS: readonly LinuxTerminalSpec[] = [
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
    id: 'x-terminal-emulator',
    displayName: 'Terminal',
    binary: 'x-terminal-emulator',
    // Debian/Ubuntu alternatives link to the system default terminal. The
    // finder follows the link and, when it points at a terminal listed
    // below, launches that terminal with its own working-directory flag.
    // Otherwise the target is unknown and no flag is portable, so the
    // launcher's `cwd` is the only way the directory is conveyed.
    buildArgs: () => [],
    systemDefaultLink: true,
  },
  {
    id: 'alacritty',
    displayName: 'Alacritty',
    binary: 'alacritty',
    buildArgs: (dir) => ['--working-directory', dir],
  },
  {
    id: 'foot',
    displayName: 'Foot',
    binary: 'foot',
    buildArgs: (dir) => ['-D', dir],
  },
  {
    id: 'ghostty',
    displayName: 'Ghostty',
    binary: 'ghostty',
    buildArgs: (dir) => [`--working-directory=${dir}`],
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
    id: 'kitty',
    displayName: 'Kitty',
    binary: 'kitty',
    buildArgs: (dir) => ['--directory', dir],
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
    id: 'wezterm',
    displayName: 'WezTerm',
    binary: 'wezterm',
    buildArgs: (dir) => ['start', '--cwd', dir],
  },
  {
    id: 'xfce4-terminal',
    displayName: 'XFCE4 Terminal',
    binary: 'xfce4-terminal',
    buildArgs: (dir) => [`--working-directory=${dir}`],
    aliases: ['xfce4'],
  },
] as const;
