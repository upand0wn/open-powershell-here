import { spawn, type ChildProcess } from 'node:child_process';
import type { LaunchOutcome } from './types';

/**
 * Start `executable` as a detached process in `targetDir`. Arguments are
 * always passed as separate argv entries; no shell is involved.
 */
export function spawnDetached(
  executable: string,
  args: string[],
  targetDir: string,
): Promise<LaunchOutcome> {
  return new Promise((resolve) => {
    let settled = false;

    let child: ChildProcess;
    try {
      child = spawn(executable, args, {
        cwd: targetDir,
        env: process.env,
        shell: false,
        detached: true,
        stdio: 'ignore',
      });
    } catch (error) {
      resolve({ ok: false, code: 'UNKNOWN', error: error as Error });
      return;
    }

    child.once('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      const code = (error as NodeJS.ErrnoException).code;
      resolve({
        ok: false,
        code: code === 'ENOENT' ? 'ENOENT' : 'UNKNOWN',
        error,
      });
    });

    child.once('spawn', () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({ ok: true, pid: child.pid ?? 0 });
    });

    child.unref();
  });
}
