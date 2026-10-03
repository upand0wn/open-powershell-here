import type { LaunchOutcome, ResolvedTerminal } from '../types';
import { spawnDetached } from '../spawn-detached';
import type { LinuxTerminalSpec } from './types';

export function launchLinuxTerminal(
  terminal: ResolvedTerminal,
  targetDir: string,
): Promise<LaunchOutcome> {
  const spec = terminal.extra?.spec as LinuxTerminalSpec | undefined;
  const args = spec !== undefined ? spec.buildArgs(targetDir) : [`--working-directory=${targetDir}`];
  return spawnDetached(terminal.binaryPath, args, targetDir);
}
