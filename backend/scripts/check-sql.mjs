import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const migrationsDir = join(root, 'supabase', 'migrations');
const migrationFiles = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()
  : [];
const failures = [];

if (!migrationFiles.length) failures.push('no SQL migration files found');
if (!existsSync(join(root, 'supabase', 'seed.sql'))) failures.push('supabase/seed.sql is missing');
if (!existsSync(join(root, 'supabase', 'config.toml'))) failures.push('supabase/config.toml is missing');

const migrationText = migrationFiles.map((file) => readFileSync(join(migrationsDir, file), 'utf8')).join('\n');
for (const marker of ['create extension if not exists pgcrypto', 'create schema if not exists private', 'create or replace function public.current_user_id']) {
  if (!migrationText.toLowerCase().includes(marker)) failures.push(`foundation migration missing: ${marker}`);
}

const seed = readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8').toLowerCase();
for (const marker of ['current_setting', 'seed is restricted', 'select 1']) {
  if (!seed.includes(marker)) failures.push(`seed guard missing: ${marker}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`SQL scaffold is valid (${migrationFiles.length} migration${migrationFiles.length === 1 ? '' : 's'}).`);
