/**
 * `node scripts/smoke-macos.mjs` — macOS-only smoke test, run by CI on a
 * real macOS runner. Drives the real finder and launcher (no mocks) to open
 * the built-in Terminal.app at a temporary folder whose name contains
 * special characters, then checks that:
 *   - the launch succeeds and settles on Terminal.app, i.e. `/usr/bin/open`
 *     really fails for the app bundle paths that do not exist;
 *   - a shell is running with that folder as its working directory.
 * This is an automated check on a CI runner, not a manual acceptance test
 * in real Obsidian (see MANUAL_TESTS.md M1–M6).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

if (process.platform !== 'darwin') {
  console.error('This smoke test only runs on macOS.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = realpathSync(mkdtempSync(join(tmpdir(), 'nth-smoke-')));
const targetDir = join(workDir, "My Vault & (x) '中文'; end");
mkdirSync(targetDir);

const bundle = join(workDir, 'manager.mjs');
await build({
  stdin: {
    contents: "export { TerminalManager } from './src/terminals/manager';",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  logLevel: 'warning',
});
const { TerminalManager } = await import(pathToFileURL(bundle).href);

/** Working directories of every running process, one path per line. */
function workingDirs() {
  try {
    return execFileSync('lsof', ['-a', '-d', 'cwd', '-Fn'], { encoding: 'utf8' });
  } catch (error) {
    // lsof exits non-zero when some processes cannot be inspected.
    return typeof error.stdout === 'string' ? error.stdout : '';
  }
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

const manager = new TerminalManager();
const result = await manager.launch(targetDir);
const terminal = manager.finder?.cached;
console.log('launch result:', result);
console.log('terminal:', terminal?.id, terminal?.extra?.appPath);

if (result.kind !== 'success') {
  fail(`launch did not succeed: ${JSON.stringify(result)}`);
} else if (terminal?.id !== 'terminal') {
  fail(`expected Terminal.app, got ${terminal?.id}`);
} else {
  let found = false;
  for (let i = 0; i < 30 && !found; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    found = workingDirs().split('\n').includes(`n${targetDir}`);
  }
  if (found) {
    console.log(`OK: a shell is running in ${targetDir}`);
  } else {
    fail(`no process has ${targetDir} as its working directory`);
  }
}

try {
  execFileSync('pkill', ['-x', 'Terminal']);
} catch {
  // Terminal was not running.
}
