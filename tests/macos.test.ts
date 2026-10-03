import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

import { MAC_TERMINALS } from '../src/terminals/macos/candidates';
import { MacTerminalFinder } from '../src/terminals/macos/finder';
import { launchMacTerminal } from '../src/terminals/macos/launcher';

class FakeChild extends EventEmitter {
  pid = 4242;
  unref = vi.fn();
}

type SpawnCall = [string, string[], Record<string, unknown>];

function makeFinder(existing: string[], home = '/Users/me'): MacTerminalFinder {
  return new MacTerminalFinder({
    checkExists: vi.fn().mockImplementation(async (path: string) => existing.includes(path)),
    env: { HOME: home },
    debug: () => {},
  });
}

const TERMINAL_APP = '/System/Applications/Utilities/Terminal.app';

describe('MAC_TERMINALS', () => {
  it('places the built-in Terminal.app first for auto-detection', () => {
    expect(MAC_TERMINALS[0].id).toBe('terminal');
  });

  it('passes the target folder as a separate argument', () => {
    const dir = "/Users/me/My Vault & (x) '中文'";
    const byId = (id: string) => MAC_TERMINALS.find((t) => t.id === id);
    expect(byId('terminal')?.buildArgs(TERMINAL_APP, dir)).toEqual(['-a', TERMINAL_APP, dir]);
    expect(byId('ghostty')?.buildArgs('/Applications/Ghostty.app', dir)).toEqual([
      '-a',
      '/Applications/Ghostty.app',
      dir,
    ]);
    expect(byId('kitty')?.buildArgs('/Applications/kitty.app', dir)).toEqual([
      '-n',
      '-a',
      '/Applications/kitty.app',
      '--args',
      '--directory',
      dir,
    ]);
  });
});

describe('MacTerminalFinder', () => {
  it('resolves Terminal.app by default even when other terminals are installed', async () => {
    const finder = makeFinder([TERMINAL_APP, '/Applications/Ghostty.app']);
    const resolved = await finder.resolve();
    expect(resolved?.id).toBe('terminal');
    expect(resolved?.binaryPath).toBe('/usr/bin/open');
    expect(resolved?.extra?.appPath).toBe(TERMINAL_APP);
  });

  it('prefers the user-selected terminal (Style Settings class value)', async () => {
    const finder = makeFinder([TERMINAL_APP, '/Applications/kitty.app']);
    finder.setPreferredTerminal('terminal-choice-kitty');
    const resolved = await finder.resolve();
    expect(resolved?.id).toBe('kitty');
    expect(resolved?.extra?.appPath).toBe('/Applications/kitty.app');
  });

  it('finds apps installed in ~/Applications', async () => {
    const finder = makeFinder([TERMINAL_APP, '/Users/me/Applications/Ghostty.app']);
    finder.setPreferredTerminal('ghostty');
    expect((await finder.resolve())?.extra?.appPath).toBe('/Users/me/Applications/Ghostty.app');
  });

  it('falls back to Terminal.app when the preferred terminal is missing or Linux-only', async () => {
    const finder = makeFinder([TERMINAL_APP]);
    finder.setPreferredTerminal('ghostty');
    expect((await finder.resolve())?.id).toBe('terminal');
    finder.setPreferredTerminal('ptyxis');
    expect((await finder.resolve())?.id).toBe('terminal');
  });

  it('returns null when nothing is installed, and caches until invalidated', async () => {
    expect(await makeFinder([]).resolve()).toBeNull();

    const finder = makeFinder([TERMINAL_APP]);
    const first = await finder.resolve();
    expect(finder.cached).toBe(first);
    finder.invalidate();
    expect(finder.cached).toBeNull();
  });
});

describe('launchMacTerminal', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('spawns /usr/bin/open detached, without a shell, with cwd set', async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => {
      setImmediate(() => child.emit('spawn'));
      return child;
    });

    const terminal = await makeFinder([TERMINAL_APP]).resolve();
    expect(terminal).not.toBeNull();
    const outcome = await launchMacTerminal(terminal!, '/Users/me/vault');
    expect(outcome).toEqual({ ok: true, pid: 4242 });

    const [file, args, options] = (spawnMock.mock.calls as unknown as SpawnCall[])[0];
    expect(file).toBe('/usr/bin/open');
    expect(args).toEqual(['-a', TERMINAL_APP, '/Users/me/vault']);
    expect(options.cwd).toBe('/Users/me/vault');
    expect(options.shell).toBe(false);
    expect(options.detached).toBe(true);
    expect(options.stdio).toBe('ignore');
  });

  it('fails without spawning when the app bundle path is missing', async () => {
    const outcome = await launchMacTerminal(
      { id: 'terminal', displayName: 'Terminal', binaryPath: '/usr/bin/open' },
      '/Users/me/vault',
    );
    expect(outcome.ok).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
