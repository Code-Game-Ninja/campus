import { mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'dist', 'android-check');
const bundlePath = join(outputDir, 'index.js');
const mapPath = join(outputDir, 'index.map');
mkdirSync(outputDir, { recursive: true });

const expoCli = requireResolve('expo/bin/cli');
const result = spawnSync(process.execPath, [
  expoCli,
  'export:embed',
  '--platform', 'android',
  '--dev', 'false',
  '--bundle-output', bundlePath,
  '--sourcemap-output', mapPath,
], { cwd: root, stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status ?? 1);

const bundle = readFileSync(bundlePath, 'utf8');
for (const marker of ['this.NONE = void 0', 'Event.NONE = void 0']) {
  if (bundle.includes(marker)) throw new Error(`Unsafe React Native Event transform found: ${marker}`);
}
console.log('Android Hermes bundle regression check passed.');

function requireResolve(specifier) {
  return import.meta.resolve(specifier).replace(/^file:\/\//, '').replace(/^\/([A-Za-z]:)/, '$1');
}
