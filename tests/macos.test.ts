import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }));
vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

import { MAC_TERMINALS } from '../src/terminals/macos/candidates';
import { MacTerminalFinder } from '../src/terminals/macos/finder';
import { launchMacTerminal } from '../src/terminals/macos/launcher';

import type { ResolvedTerminal } from '../src/terminals/types';

type ExecFileCallback = (error: Error | null) => void;
type ExecFileCall = [string, string[], Record<string, unknown>, ExecFileCallback];

function makeFinder(home = '/Users/me'): MacTerminalFinder {
  return new MacTerminalFinder({ env: { HOME: home }, debug: () => {} });
}

/**
 * Drive the finder the way the manager does: an app bundle path that is
 * not in `existing` fails to open and is rejected, until one opens.
 */
async function resolveExisting(
  finder: MacTerminalFinder,
  existing: string[],
): Promise<ResolvedTerminal | null> {
  for (;;) {
    const candidate = await finder.resolve();
    if (candidate === null || existing.includes(candidate.extra?.appPath as string)) {
      return candidate;
    }
    finder.reject(candidate);
  }
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
    const resolved = await resolveExisting(makeFinder(), [TERMINAL_APP, '/Applications/Ghostty.app']);
    expect(resolved?.id).toBe('terminal');
    expect(resolved?.binaryPath).toBe('/usr/bin/open');
    expect(resolved?.extra?.appPath).toBe(TERMINAL_APP);
  });

  it('prefers the user-selected terminal (Style Settings class value)', async () => {
    const finder = makeFinder();
    finder.setPreferredTerminal('terminal-choice-kitty');
    const resolved = await resolveExisting(finder, [TERMINAL_APP, '/Applications/kitty.app']);
    expect(resolved?.id).toBe('kitty');
    expect(resolved?.extra?.appPath).toBe('/Applications/kitty.app');
  });

  it('finds apps installed in ~/Applications', async () => {
    const finder = makeFinder();
    finder.setPreferredTerminal('ghostty');
    const resolved = await resolveExisting(finder, [TERMINAL_APP, '/Users/me/Applications/Ghostty.app']);
    expect(resolved?.extra?.appPath).toBe('/Users/me/Applications/Ghostty.app');
  });

  it('falls back to Terminal.app when the preferred terminal is missing or Linux-only', async () => {
    const finder = makeFinder();
    finder.setPreferredTerminal('ghostty');
    expect((await resolveExisting(finder, [TERMINAL_APP]))?.id).toBe('terminal');
    finder.setPreferredTerminal('ptyxis');
    expect((await resolveExisting(finder, [TERMINAL_APP]))?.id).toBe('terminal');
  });

  it('returns null when nothing is installed, and caches until invalidated', async () => {
    expect(await resolveExisting(makeFinder(), [])).toBeNull();

    const finder = makeFinder();
    const first = await resolveExisting(finder, [TERMINAL_APP]);
    expect(finder.cached).toBe(first);
    expect(await finder.resolve()).toBe(first);
    finder.invalidate();
    expect(finder.cached).toBeNull();
  });
});

describe('launchMacTerminal', () => {
  const terminal: ResolvedTerminal = {
    id: 'terminal',
    displayName: 'Terminal',
    binaryPath: '/usr/bin/open',
    extra: { spec: MAC_TERMINALS[0], appPath: TERMINAL_APP },
  };

  function mockOpen(error: Error | null): void {
    execFileMock.mockImplementation((...args: unknown[]) => {
      setImmediate(() => (args as ExecFileCall)[3](error));
      return { pid: 4242 };
    });
  }

  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('runs /usr/bin/open without a shell, with cwd set', async () => {
    mockOpen(null);
    const outcome = await launchMacTerminal(terminal, '/Users/me/vault');
    expect(outcome).toEqual({ ok: true, pid: 4242 });

    const [file, args, options] = (execFileMock.mock.calls as unknown as ExecFileCall[])[0];
    expect(file).toBe('/usr/bin/open');
    expect(args).toEqual(['-a', TERMINAL_APP, '/Users/me/vault']);
    expect(options.cwd).toBe('/Users/me/vault');
    expect(options.shell).toBe(false);
  });

  it('reports a non-zero exit of open as ENOENT so the next candidate is tried', async () => {
    mockOpen(Object.assign(new Error('The file does not exist.'), { code: 1 }));
    const outcome = await launchMacTerminal(terminal, '/Users/me/vault');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe('ENOENT');
    }
  });

  it('reports other failures (e.g. timeout) as UNKNOWN', async () => {
    mockOpen(Object.assign(new Error('killed'), { killed: true, signal: 'SIGTERM' }));
    const outcome = await launchMacTerminal(terminal, '/Users/me/vault');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe('UNKNOWN');
    }
  });

  it('fails without spawning when the app bundle path is missing', async () => {
    const outcome = await launchMacTerminal(
      { id: 'terminal', displayName: 'Terminal', binaryPath: '/usr/bin/open' },
      '/Users/me/vault',
    );
    expect(outcome.ok).toBe(false);
    expect(execFileMock).not.toHaveBeenCalled();
  });
});
