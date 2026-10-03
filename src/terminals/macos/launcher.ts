import type { LaunchOutcome, ResolvedTerminal } from '../types';
import { spawnDetached } from '../spawn-detached';
import type { MacTerminalSpec } from './types';

export function launchMacTerminal(
  terminal: ResolvedTerminal,
  targetDir: string,
): Promise<LaunchOutcome> {
  const spec = terminal.extra?.spec as MacTerminalSpec | undefined;
  const appPath = terminal.extra?.appPath as string | undefined;
  if (spec === undefined || appPath === undefined) {
    return Promise.resolve({
      ok: false,
      code: 'UNKNOWN',
      error: new Error('Resolved macOS terminal is missing its app bundle path.'),
    });
  }
  return spawnDetached(terminal.binaryPath, spec.buildArgs(appPath, targetDir), targetDir);
}
