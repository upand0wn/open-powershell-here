import { describe, expect, it, vi } from 'vitest';
import { LinuxTerminalFinder } from '../src/terminals/linux/finder';
import type { LinuxTerminalSpec } from '../src/terminals/linux/types';

const TEST_SPECS: LinuxTerminalSpec[] = [
  { id: 'ghostty', displayName: 'Ghostty', binary: 'ghostty', buildArgs: (d) => [d] },
  { id: 'konsole', displayName: 'Konsole', binary: 'konsole', buildArgs: (d) => [d] },
  { id: 'alacritty', displayName: 'Alacritty', binary: 'alacritty', buildArgs: (d) => [d] },
];

describe('LinuxTerminalFinder', () => {
  it('resolves the first available terminal in spec priority order by default', async () => {
    const checkExecutable = vi.fn().mockImplementation(async (path: string) => {
      return path === '/usr/bin/ghostty' || path === '/usr/bin/konsole';
    });

    const finder = new LinuxTerminalFinder({
      specs: TEST_SPECS,
      checkExecutable,
      env: { PATH: '/usr/local/bin:/usr/bin' },
    });

    const resolved = await finder.resolve();
    expect(resolved).toEqual({
      id: 'ghostty',
      displayName: 'Ghostty',
      binaryPath: '/usr/bin/ghostty',
      extra: { spec: TEST_SPECS[0] },
    });
  });

  it('prefers a user-selected terminal over the default priority order', async () => {
    const checkExecutable = vi.fn().mockImplementation(async (path: string) => {
      return path === '/usr/bin/ghostty' || path === '/usr/bin/konsole';
    });

    const finder = new LinuxTerminalFinder({
      specs: TEST_SPECS,
      checkExecutable,
      env: { PATH: '/usr/bin' },
    });

    // User chooses 'konsole' via Style Settings
    finder.setPreferredTerminal('konsole');
    const resolved = await finder.resolve();
    expect(resolved?.id).toBe('konsole');
    expect(resolved?.binaryPath).toBe('/usr/bin/konsole');
  });

  it('resolves legacy preferred-terminal aliases (Style Settings values)', async () => {
    const specs: LinuxTerminalSpec[] = [
      { id: 'ghostty', displayName: 'Ghostty', binary: 'ghostty', buildArgs: (d) => [d] },
      {
        id: 'gnome-terminal',
        displayName: 'GNOME Terminal',
        binary: 'gnome-terminal',
        buildArgs: (d) => [d],
        aliases: ['gnome'],
      },
    ];
    const checkExecutable = vi.fn().mockImplementation(async (path: string) => {
      return path === '/usr/bin/gnome-terminal';
    });

    const finder = new LinuxTerminalFinder({
      specs,
      checkExecutable,
      env: { PATH: '/usr/bin' },
    });

    finder.setPreferredTerminal('terminal-choice-gnome');
    const resolved = await finder.resolve();
    expect(resolved?.id).toBe('gnome-terminal');
    expect(resolved?.binaryPath).toBe('/usr/bin/gnome-terminal');
  });

  it('falls back to default priority order when preferred terminal is not installed', async () => {
    const checkExecutable = vi.fn().mockImplementation(async (path: string) => {
      return path === '/usr/bin/ghostty';
    });

    const finder = new LinuxTerminalFinder({
      specs: TEST_SPECS,
      checkExecutable,
      env: { PATH: '/usr/bin' },
    });

    // User chooses 'alacritty', which is not installed
    finder.setPreferredTerminal('alacritty');
    const resolved = await finder.resolve();
    expect(resolved?.id).toBe('ghostty');
    expect(resolved?.binaryPath).toBe('/usr/bin/ghostty');
  });

  describe('system default terminal', () => {
    const DEFAULT_SPECS: LinuxTerminalSpec[] = [
      { id: 'xdg-terminal-exec', displayName: 'System Default', binary: 'xdg-terminal-exec', buildArgs: (d) => [d] },
      {
        id: 'x-terminal-emulator',
        displayName: 'Terminal',
        binary: 'x-terminal-emulator',
        buildArgs: () => [],
        systemDefaultLink: true,
      },
      { id: 'ghostty', displayName: 'Ghostty', binary: 'ghostty', buildArgs: (d) => [d] },
      { id: 'gnome-terminal', displayName: 'GNOME Terminal', binary: 'gnome-terminal', buildArgs: (d) => [d] },
    ];

    function makeFinder(installed: string[], realPath: string | null): LinuxTerminalFinder {
      return new LinuxTerminalFinder({
        specs: DEFAULT_SPECS,
        checkExecutable: async (path) => installed.includes(path),
        resolveRealPath: async () => realPath,
        env: { PATH: '/usr/bin' },
        debug: () => {},
      });
    }

    it('uses xdg-terminal-exec ahead of any installed terminal', async () => {
      const finder = makeFinder(
        ['/usr/bin/xdg-terminal-exec', '/usr/bin/x-terminal-emulator', '/usr/bin/ghostty'],
        '/usr/bin/ghostty',
      );
      expect((await finder.resolve())?.id).toBe('xdg-terminal-exec');
    });

    it('follows x-terminal-emulator to a supported terminal (Debian wrapper)', async () => {
      const finder = makeFinder(
        ['/usr/bin/x-terminal-emulator', '/usr/bin/ghostty', '/usr/bin/gnome-terminal'],
        '/usr/bin/gnome-terminal.wrapper',
      );
      const resolved = await finder.resolve();
      expect(resolved?.id).toBe('gnome-terminal');
      expect(resolved?.binaryPath).toBe('/usr/bin/gnome-terminal');
    });

    it('launches x-terminal-emulator itself when its target is unknown or unresolvable', async () => {
      const installed = ['/usr/bin/x-terminal-emulator', '/usr/bin/ghostty'];
      expect((await makeFinder(installed, '/usr/bin/xterm').resolve())?.id).toBe('x-terminal-emulator');
      expect((await makeFinder(installed, null).resolve())?.id).toBe('x-terminal-emulator');
    });

    it('still honours an explicitly preferred terminal over the system default', async () => {
      const finder = makeFinder(['/usr/bin/xdg-terminal-exec', '/usr/bin/ghostty'], null);
      finder.setPreferredTerminal('terminal-choice-ghostty');
      expect((await finder.resolve())?.id).toBe('ghostty');
    });
  });

  it('caches the resolved terminal and does not re-scan until invalidated', async () => {
    const checkExecutable = vi.fn().mockImplementation(async (path: string) => {
      return path === '/usr/bin/ghostty';
    });

    const finder = new LinuxTerminalFinder({
      specs: TEST_SPECS,
      checkExecutable,
      env: { PATH: '/usr/bin' },
    });

    const first = await finder.resolve();
    const second = await finder.resolve();
    expect(first).toEqual(second);
    expect(finder.cached).toEqual(first);
    expect(checkExecutable).toHaveBeenCalledTimes(1);

    finder.invalidate();
    expect(finder.cached).toBeNull();

    await finder.resolve();
    expect(checkExecutable).toHaveBeenCalledTimes(2);
  });
});
