import { execFile } from 'node:child_process';
import type { LaunchOutcome, ResolvedTerminal } from '../types';
import type { MacTerminalSpec } from './types';

const OPEN_TIMEOUT_MS = 10000;

/**
 * Open the terminal app through `/usr/bin/open` (no shell) and wait for
 * `open` itself to exit; it returns as soon as the app has been asked to
 * open. A non-zero exit status means the app bundle could not be opened —
 * typically because it is not installed at that path — and is reported as
 * `ENOENT` so the next candidate is tried.
 */
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

  return new Promise((resolve) => {
    try {
      const child = execFile(
        terminal.binaryPath,
        spec.buildArgs(appPath, targetDir),
        { cwd: targetDir, env: process.env, shell: false, timeout: OPEN_TIMEOUT_MS },
        (error) => {
          if (error === null) {
            resolve({ ok: true, pid: child.pid ?? 0 });
            return;
          }
          const code = (error as NodeJS.ErrnoException).code;
          resolve({
            ok: false,
            code: code === 'ENOENT' || typeof code === 'number' ? 'ENOENT' : 'UNKNOWN',
            error,
          });
        },
      );
    } catch (error) {
      resolve({ ok: false, code: 'UNKNOWN', error: error as Error });
    }
  });
}
