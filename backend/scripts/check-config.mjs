import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const required = ['package.json', 'tsconfig.json', '.env.example', 'supabase/config.toml'];
const missing = required.filter((file) => !existsSync(resolve(root, file)));

if (missing.length) {
  console.error(`Missing backend scaffold files: ${missing.join(', ')}`);
  process.exit(1);
}

const example = readFileSync(resolve(root, '.env.example'), 'utf8');
const forbidden = ['sk_live_', 'service_role_secret', 'BEGIN PRIVATE KEY'];
const leaked = forbidden.filter((token) => example.includes(token));
if (leaked.length) {
  console.error(`Potential secret material found in .env.example: ${leaked.join(', ')}`);
  process.exit(1);
}

console.log('Backend scaffold configuration is valid.');
