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
const migrationEight = readFileSync(join(migrationsDir, '0008_notification_outbox.sql'), 'utf8').toLowerCase();
const restrictionTriggerFix = readFileSync(join(migrationsDir, '0018_content_restriction_trigger_fix.sql'), 'utf8').toLowerCase();
const peopleDiscovery = readFileSync(join(migrationsDir, '0019_people_discovery_recommendations.sql'), 'utf8').toLowerCase();
const conflictIndexes = readFileSync(join(migrationsDir, '0020_conflict_target_indexes.sql'), 'utf8').toLowerCase();
const teamCreationConflictIndexes = readFileSync(join(migrationsDir, '0021_team_creation_conflict_targets.sql'), 'utf8').toLowerCase();

for (const file of migrationFiles) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  if (/,[\t ]*\r?\n[\t ]*\)/.test(sql)) failures.push(`${file} contains a trailing comma before )`);
}
for (const marker of ['create extension if not exists pgcrypto', 'create schema if not exists private', 'create or replace function public.current_user_id', 'alter table public.users add column if not exists campus_id uuid', 'alter table public.profiles add column if not exists profile_visibility text', 'alter table public.users enable row level security', 'create trigger on_auth_user_created', "alter table public.users alter column display_name set default 'student'", "new.raw_user_meta_data ->> 'display_name'", "alter table public.users alter column status set default 'pending'", "check (status in ('pending', 'active', 'suspended', 'deleted'))", 'create table if not exists public.events', 'create or replace function public.register_for_event', 'alter table public.events enable row level security', 'create table if not exists public.posts', 'create table if not exists public.team_requests', 'create table if not exists public.connections', 'create table if not exists public.notifications', 'create table if not exists public.notification_outbox', 'create or replace function public.enqueue_due_event_reminders', 'create or replace function public.claim_notification_outbox', 'create or replace function public.complete_notification_delivery', 'create table if not exists public.user_blocks', 'create table if not exists public.analytics_events', 'create policy analytics_consent_insert', 'create table if not exists public.conversations', 'create table if not exists public.conversation_members', 'create table if not exists public.messages', 'alter table public.conversations add column if not exists last_message_id uuid', 'alter table public.messages add column if not exists client_message_id text', 'create unique index if not exists messages_sender_client_uidx', 'create table if not exists public.chat_message_events', 'create or replace function public.send_message', 'create or replace function public.mark_conversation_read', 'create or replace function public.attach_message_file', 'supabase_realtime', 'chat-attachments']) {
  if (!migrationText.toLowerCase().includes(marker)) failures.push(`foundation migration missing: ${marker}`);
}

for (const marker of ['create or replace function public.search_mobile', 'create or replace function public.search_campuses_mobile', 'catalog_source_id', 'create table if not exists public.resources', 'create or replace function public.create_resource_upload_intent_mobile', 'create or replace function public.complete_resource_upload_mobile', 'create or replace function public.list_resources_mobile', 'create or replace function public.apply_moderation_action', 'create or replace function public.list_moderation_queue', 'create or replace function public.list_moderation_audit', 'create or replace function public.record_analytics_event', 'create or replace function public.request_account_deletion', 'create or replace function public.request_data_export', 'create or replace function public.export_my_data', 'create or replace function public.claim_account_deletions', 'create or replace function public.expire_team_requests', 'create or replace function public.cleanup_retention', 'create or replace function public.consume_rate_limit', 'create or replace function public.feed_page', 'create or replace function public.events_page', 'create or replace function public.team_requests_page', 'create or replace function public.notifications_page', 'create or replace function public.update_notification_preferences', 'create table if not exists public.account_requests', 'create unique index if not exists user_restrictions_active_uidx', 'create policy post_media_read on storage.objects']) {
  if (!migrationText.toLowerCase().includes(marker)) failures.push(`domain hardening migration missing: ${marker}`);
}

if (migrationEight.includes("quiet_hours ->> 'start'")) {
  failures.push('applied migration 0008 contains later quiet-hour changes; move them to a new migration');
}

for (const marker of ["row_data := to_jsonb(new)", "row_data ? 'author_id'", "row_data ? 'owner_id'"]) {
  if (!restrictionTriggerFix.includes(marker)) failures.push(`content restriction trigger fix missing: ${marker}`);
}
if (/new\.(author_id|owner_id)/.test(restrictionTriggerFix)) {
  failures.push('content restriction trigger fix must not directly access table-specific NEW fields');
}

for (const marker of ['create or replace function public.search_people_mobile', 'create or replace function public.recommend_people_mobile', 'create or replace function public.get_discoverable_profile_mobile', "u.status = 'active'", 'p.discoverable', 'not public.are_users_blocked', 'grant execute']) {
  if (!peopleDiscovery.includes(marker)) failures.push(`people discovery migration missing: ${marker}`);
}
if (!peopleDiscovery.includes("jsonb_typeof(actor_profile.availability) = 'object'") || !peopleDiscovery.includes("jsonb_typeof(p.availability) = 'object'")) {
  failures.push('people recommendations must guard non-object availability JSON');
}
for (const marker of ['create unique index if not exists connections_pair_unique', 'create unique index if not exists conversations_direct_connection_uidx', 'create unique index if not exists conversations_team_request_uidx', 'create unique index if not exists conversations_event_uidx', 'create unique index if not exists conversation_members_pair_uidx']) {
  if (!conflictIndexes.includes(marker)) failures.push(`conflict target index migration missing: ${marker}`);
}
for (const marker of ['create unique index if not exists conversations_team_request_conflict_uidx', 'create unique index if not exists skills_name_conflict_uidx', 'create unique index if not exists interests_name_conflict_uidx']) {
  if (!teamCreationConflictIndexes.includes(marker)) failures.push(`team creation conflict target missing: ${marker}`);
}
if (/on public\.conversations \((direct_connection_id|team_request_id|event_id)\)\s+where/.test(conflictIndexes)) {
  failures.push('conversation ON CONFLICT targets require non-partial unique indexes');
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
