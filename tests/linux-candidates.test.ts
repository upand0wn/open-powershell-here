import { describe, expect, it } from 'vitest';
import { LINUX_TERMINALS } from '../src/terminals/linux/candidates';

describe('LINUX_TERMINALS', () => {
  it('places the system default terminal mechanisms first', () => {
    expect(LINUX_TERMINALS[0].id).toBe('xdg-terminal-exec');
    expect(LINUX_TERMINALS[1].id).toBe('x-terminal-emulator');
    expect(LINUX_TERMINALS[1].systemDefaultLink).toBe(true);
  });

  it('favours no individual terminal: the rest are in alphabetical order', () => {
    const rest = LINUX_TERMINALS.slice(2).map((t) => t.id);
    expect(rest).toEqual([...rest].sort());
    expect(rest).toContain('ghostty');
    expect(rest).toContain('kitty');
    expect(rest).toContain('ptyxis');
  });

  it('builds proper working directory argument for Ghostty', () => {
    const ghostty = LINUX_TERMINALS.find((t) => t.id === 'ghostty');
    expect(ghostty).toBeDefined();
    expect(ghostty?.buildArgs('/home/user/vault')).toEqual([
      '--working-directory=/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for Alacritty', () => {
    const alacritty = LINUX_TERMINALS.find((t) => t.id === 'alacritty');
    expect(alacritty?.buildArgs('/home/user/vault')).toEqual([
      '--working-directory',
      '/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for Kitty', () => {
    const kitty = LINUX_TERMINALS.find((t) => t.id === 'kitty');
    expect(kitty?.buildArgs('/home/user/vault')).toEqual([
      '--directory',
      '/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for WezTerm', () => {
    const wezterm = LINUX_TERMINALS.find((t) => t.id === 'wezterm');
    expect(wezterm?.buildArgs('/home/user/vault')).toEqual([
      'start',
      '--cwd',
      '/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for Konsole', () => {
    const konsole = LINUX_TERMINALS.find((t) => t.id === 'konsole');
    expect(konsole?.buildArgs('/home/user/vault')).toEqual([
      '--workdir',
      '/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for GNOME Terminal', () => {
    const gnome = LINUX_TERMINALS.find((t) => t.id === 'gnome-terminal');
    expect(gnome?.buildArgs('/home/user/vault')).toEqual([
      '--working-directory=/home/user/vault',
    ]);
  });

  it('builds proper arguments for Ptyxis (new window + working directory)', () => {
    const ptyxis = LINUX_TERMINALS.find((t) => t.id === 'ptyxis');
    expect(ptyxis).toBeDefined();
    expect(ptyxis?.binary).toBe('ptyxis');
    expect(ptyxis?.buildArgs('/home/user/vault')).toEqual([
      '--new-window',
      '--working-directory=/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for the system default terminal', () => {
    const systemDefault = LINUX_TERMINALS.find((t) => t.id === 'xdg-terminal-exec');
    expect(systemDefault?.binary).toBe('xdg-terminal-exec');
    expect(systemDefault?.buildArgs('/home/user/vault')).toEqual([
      '--dir=/home/user/vault',
    ]);
  });

  it('builds proper working directory argument for GNOME Console', () => {
    const kgx = LINUX_TERMINALS.find((t) => t.id === 'kgx');
    expect(kgx?.binary).toBe('kgx');
    expect(kgx?.buildArgs('/home/user/vault')).toEqual([
      '--working-directory=/home/user/vault',
    ]);
  });

  it('keeps legacy aliases for the preferred-terminal setting', () => {
    expect(LINUX_TERMINALS.find((t) => t.id === 'gnome-terminal')?.aliases).toContain('gnome');
    expect(LINUX_TERMINALS.find((t) => t.id === 'xfce4-terminal')?.aliases).toContain('xfce4');
  });

  it('builds proper working directory argument for Foot', () => {
    const foot = LINUX_TERMINALS.find((t) => t.id === 'foot');
    expect(foot?.buildArgs('/home/user/vault')).toEqual([
      '-D',
      '/home/user/vault',
    ]);
  });
});
