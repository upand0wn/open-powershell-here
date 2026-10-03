import { describe, expect, it, vi } from 'vitest';
import { parseAlternativeValue } from '../src/terminals/linux/alternatives';
import { LinuxTerminalFinder } from '../src/terminals/linux/finder';
import type { LinuxTerminalSpec } from '../src/terminals/linux/types';
import type { ResolvedTerminal } from '../src/terminals/types';

const TEST_SPECS: LinuxTerminalSpec[] = [
  { id: 'ghostty', displayName: 'Ghostty', binary: 'ghostty', buildArgs: (d) => [d] },
  { id: 'konsole', displayName: 'Konsole', binary: 'konsole', buildArgs: (d) => [d] },
  { id: 'alacritty', displayName: 'Alacritty', binary: 'alacritty', buildArgs: (d) => [d] },
];

function makeFinder(specs: LinuxTerminalSpec[] = TEST_SPECS): LinuxTerminalFinder {
  return new LinuxTerminalFinder({ specs, queryAlternative: async () => null, debug: () => {} });
}

/**
 * Drive the finder the way the manager does: a candidate whose binary is
 * not in `installed` fails to spawn and is rejected, until one starts.
 */
async function resolveInstalled(
  finder: LinuxTerminalFinder,
  installed: string[],
): Promise<ResolvedTerminal | null> {
  for (;;) {
    const candidate = await finder.resolve();
    if (candidate === null || installed.includes(candidate.binaryPath)) {
      return candidate;
    }
    finder.reject(candidate);
  }
}

describe('LinuxTerminalFinder', () => {
  it('offers the first terminal in spec priority order, by bare binary name', async () => {
    expect(await makeFinder().resolve()).toEqual({
      id: 'ghostty',
      displayName: 'Ghostty',
      binaryPath: 'ghostty',
      extra: { spec: TEST_SPECS[0] },
    });
  });

  it('moves on to the next candidate when one is rejected', async () => {
    const resolved = await resolveInstalled(makeFinder(), ['konsole', 'alacritty']);
    expect(resolved?.id).toBe('konsole');
  });

  it('prefers a user-selected terminal over the default priority order', async () => {
    const finder = makeFinder();
    // User chooses 'konsole' via Style Settings
    finder.setPreferredTerminal('konsole');
    const resolved = await resolveInstalled(finder, ['ghostty', 'konsole']);
    expect(resolved?.id).toBe('konsole');
    expect(resolved?.binaryPath).toBe('konsole');
  });

  it('resolves legacy preferred-terminal aliases (Style Settings values)', async () => {
    const finder = makeFinder([
      { id: 'ghostty', displayName: 'Ghostty', binary: 'ghostty', buildArgs: (d) => [d] },
      {
        id: 'gnome-terminal',
        displayName: 'GNOME Terminal',
        binary: 'gnome-terminal',
        buildArgs: (d) => [d],
        aliases: ['gnome'],
      },
    ]);

    finder.setPreferredTerminal('terminal-choice-gnome');
    expect((await finder.resolve())?.id).toBe('gnome-terminal');
  });

  it('falls back to default priority order when preferred terminal is not installed', async () => {
    const finder = makeFinder();
    // User chooses 'alacritty', which is not installed
    finder.setPreferredTerminal('alacritty');
    expect((await finder.resolve())?.id).toBe('alacritty');
    expect((await resolveInstalled(finder, ['ghostty']))?.id).toBe('ghostty');
  });

  it('returns null once every candidate is rejected, then starts over', async () => {
    const finder = makeFinder();
    expect(await resolveInstalled(finder, [])).toBeNull();
    expect((await finder.resolve())?.id).toBe('ghostty');
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

    function makeDefaultFinder(alternative: string | null): LinuxTerminalFinder {
      return new LinuxTerminalFinder({
        specs: DEFAULT_SPECS,
        queryAlternative: async () => alternative,
        debug: () => {},
      });
    }

    it('uses xdg-terminal-exec ahead of any installed terminal', async () => {
      const resolved = await resolveInstalled(makeDefaultFinder('/usr/bin/ghostty'), [
        'xdg-terminal-exec',
        'x-terminal-emulator',
        'ghostty',
      ]);
      expect(resolved?.id).toBe('xdg-terminal-exec');
    });

    it('follows x-terminal-emulator to a supported terminal (Debian wrapper)', async () => {
      const resolved = await resolveInstalled(makeDefaultFinder('/usr/bin/gnome-terminal.wrapper'), [
        'x-terminal-emulator',
        'ghostty',
        'gnome-terminal',
      ]);
      expect(resolved?.displayName).toBe('GNOME Terminal');
      expect(resolved?.binaryPath).toBe('gnome-terminal');
      expect(resolved?.extra?.spec).toBe(DEFAULT_SPECS[3]);
    });

    it('launches x-terminal-emulator itself when its target is unknown or unresolvable', async () => {
      const installed = ['x-terminal-emulator', 'ghostty'];
      expect((await resolveInstalled(makeDefaultFinder('/usr/bin/xterm'), installed))?.binaryPath).toBe(
        'x-terminal-emulator',
      );
      expect((await resolveInstalled(makeDefaultFinder(null), installed))?.binaryPath).toBe(
        'x-terminal-emulator',
      );
    });

    it('does not offer the link again when the followed terminal fails to start', async () => {
      const resolved = await resolveInstalled(makeDefaultFinder('/usr/bin/gnome-terminal'), ['ghostty']);
      expect(resolved?.id).toBe('ghostty');
    });

    it('still honours an explicitly preferred terminal over the system default', async () => {
      const finder = makeDefaultFinder(null);
      finder.setPreferredTerminal('terminal-choice-ghostty');
      expect((await finder.resolve())?.id).toBe('ghostty');
    });
  });

  it('caches the resolved terminal until it is rejected or invalidated', async () => {
    const query = vi.fn().mockResolvedValue(null);
    const finder = new LinuxTerminalFinder({ specs: TEST_SPECS, queryAlternative: query, debug: () => {} });

    const first = await finder.resolve();
    expect(await finder.resolve()).toBe(first);
    expect(finder.cached).toBe(first);

    finder.reject(first!);
    expect(finder.cached).toBeNull();
    expect((await finder.resolve())?.id).toBe('konsole');

    finder.invalidate();
    expect(finder.cached).toBeNull();
    expect((await finder.resolve())?.id).toBe('ghostty');
  });
});

describe('parseAlternativeValue', () => {
  it('reads the Value field of update-alternatives --query output', () => {
    const output = [
      'Name: x-terminal-emulator',
      'Link: /usr/bin/x-terminal-emulator',
      'Status: manual',
      'Best: /usr/bin/ptyxis',
      'Value: /usr/bin/kitty',
      '',
      'Alternative: /usr/bin/kitty',
      'Priority: 20',
    ].join('\n');
    expect(parseAlternativeValue(output)).toBe('/usr/bin/kitty');
  });

  it('returns null when there is no usable value', () => {
    expect(parseAlternativeValue('')).toBeNull();
    expect(parseAlternativeValue('Name: x-terminal-emulator\nValue: none\n')).toBeNull();
  });
});
