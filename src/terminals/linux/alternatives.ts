import { execFile } from 'node:child_process';

const QUERY_TIMEOUT_MS = 5000;

/**
 * Ask the Debian alternatives system which program `name` (for example
 * `x-terminal-emulator`) currently points at. Runs
 * `update-alternatives --query <name>` without a shell and returns the
 * `Value:` path, or `null` when it cannot be determined (not a Debian-based
 * system, no such alternative, timeout).
 */
export function queryAlternative(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(
        'update-alternatives',
        ['--query', name],
        { shell: false, timeout: QUERY_TIMEOUT_MS, encoding: 'utf8', env: process.env },
        (error, stdout) => {
          resolve(error === null ? parseAlternativeValue(stdout) : null);
        },
      );
    } catch {
      resolve(null);
    }
  });
}

/** Extract the `Value:` field from `update-alternatives --query` output. */
export function parseAlternativeValue(output: string): string | null {
  const match = /^Value:[ \t]*(\S.*)$/m.exec(output);
  if (match === null) {
    return null;
  }
  const value = match[1].trim();
  return value === '' || value === 'none' ? null : value;
}
