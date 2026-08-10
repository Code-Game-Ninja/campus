import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const backend = join(root, 'backend');
const prototype = join(root, 'prototype');
const migration = readFileSync(join(backend, 'supabase', 'migrations', '0013_mobile_transactional_mutations.sql'), 'utf8');
const api = readFileSync(join(prototype, 'src', 'lib', 'api.ts'), 'utf8');
const navigation = readFileSync(join(prototype, 'src', 'lib', 'navigation.ts'), 'utf8');
const composer = readFileSync(join(prototype, 'app', 'compose', 'index.tsx'), 'utf8');
const conversation = readFileSync(join(prototype, 'app', 'chat', '[id].tsx'), 'utf8');

const requiredFunctions = [
  'update_my_profile_mobile', 'create_team_request_mobile_v2', 'create_post_mobile',
  'post_poll_state_mobile', 'set_post_poll_vote_mobile',
  'create_comment_mobile', 'set_post_reaction_mobile', 'set_bookmark_mobile',
  'apply_to_team_mobile', 'set_follow_mobile', 'register_device_mobile',
  'mark_notification_read_mobile',
  'update_post_mobile', 'delete_post_mobile', 'set_event_reminder_mobile',
  'set_chat_mute_mobile', 'create_report_mobile', 'set_block_mobile',
  'withdraw_team_application_mobile', 'disable_device_mobile',
];
for (const name of requiredFunctions) {
  if (!migration.includes(`function public.${name}`)) throw new Error(`Missing SQL function: ${name}`);
  if (!api.includes(`'${name}'`)) throw new Error(`Mobile adapter does not call: ${name}`);
}

for (const name of ['feed_page', 'events_page', 'team_requests_page', 'notifications_page']) {
  if (!api.includes(`'${name}'`)) throw new Error(`Mobile adapter does not use cursor RPC: ${name}`);
}

for (const marker of ['attach_message_file', 'uploadChatAttachment', 'message_attachments(*)']) {
  if (!api.includes(marker)) throw new Error(`Mobile chat attachment wiring missing: ${marker}`);
}
for (const marker of ['pickChatAttachment', 'uploadingAttachment', 'getChatAttachmentUrl']) {
  if (!conversation.includes(marker)) throw new Error(`Chat attachment UI missing: ${marker}`);
}
for (const marker of ['pickPostMedia', 'uploadPostMedia', 'pollEnabled', '2000']) {
  if (!composer.includes(marker)) throw new Error(`Post format UI missing: ${marker}`);
}

for (const route of ['/assistant', '/discover/clubs', '/discover/listings', '/discover/notes', '/discover/opportunities']) {
  if (!navigation.includes(`prefix: '${route}'`)) throw new Error(`MVP boundary missing route: ${route}`);
}

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const activeSources = [...filesUnder(join(prototype, 'app')), ...filesUnder(join(prototype, 'src'))]
  .filter((path) => /\.(ts|tsx)$/.test(path));
for (const path of activeSources) {
  const source = readFileSync(path, 'utf8');
  if (/from\s+['"][^'"]*mockBackend['"]/.test(source)) {
    throw new Error(`Active mock backend import: ${relative(root, path)}`);
  }
}

console.log('MVP static coverage is valid.');
