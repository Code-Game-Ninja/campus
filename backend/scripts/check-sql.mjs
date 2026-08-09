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
for (const marker of ['create extension if not exists pgcrypto', 'create schema if not exists private', 'create or replace function public.current_user_id', 'alter table public.users enable row level security', 'create trigger on_auth_user_created', 'create table if not exists public.events', 'create or replace function public.register_for_event', 'alter table public.events enable row level security', 'create table if not exists public.posts', 'create table if not exists public.team_requests', 'create table if not exists public.connections', 'create table if not exists public.notifications', 'create table if not exists public.user_blocks', 'create table if not exists public.analytics_events', 'create policy analytics_consent_insert', 'create table if not exists public.conversations', 'create table if not exists public.conversation_members', 'create table if not exists public.messages', 'create table if not exists public.chat_message_events', 'create or replace function public.send_message', 'create or replace function public.mark_conversation_read', 'create or replace function public.attach_message_file', 'supabase_realtime', 'chat-attachments']) {
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
