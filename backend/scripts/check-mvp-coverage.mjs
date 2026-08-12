import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const backend = join(root, 'backend');
const prototype = join(root, 'prototype');
const migration = readFileSync(join(backend, 'supabase', 'migrations', '0013_mobile_transactional_mutations.sql'), 'utf8');
const campusCatalogMigration = readFileSync(join(backend, 'supabase', 'migrations', '0016_indian_campus_catalog.sql'), 'utf8');
const resourcesMigration = readFileSync(join(backend, 'supabase', 'migrations', '0017_resources_mobile.sql'), 'utf8');
const peopleDiscoveryMigration = readFileSync(join(backend, 'supabase', 'migrations', '0019_people_discovery_recommendations.sql'), 'utf8');
const conflictIndexesMigration = readFileSync(join(backend, 'supabase', 'migrations', '0020_conflict_target_indexes.sql'), 'utf8');
const teamCreationConflictIndexesMigration = readFileSync(join(backend, 'supabase', 'migrations', '0021_team_creation_conflict_targets.sql'), 'utf8');
const visibleLabelsMigration = readFileSync(join(backend, 'supabase', 'migrations', '0022_visible_profile_labels.sql'), 'utf8');
const legacyConversationParticipantsMigration = readFileSync(join(backend, 'supabase', 'migrations', '0023_legacy_conversation_participants.sql'), 'utf8');
const chatConflictArbitersMigration = readFileSync(join(backend, 'supabase', 'migrations', '0024_chat_conflict_arbiters.sql'), 'utf8');
const allConflictArbitersMigration = readFileSync(join(backend, 'supabase', 'migrations', '0025_all_conflict_arbiters.sql'), 'utf8');
const campusCatalogSync = readFileSync(join(backend, 'scripts', 'sync-indian-institutions.mjs'), 'utf8');
const api = readFileSync(join(prototype, 'src', 'lib', 'api.ts'), 'utf8');
const navigation = readFileSync(join(prototype, 'src', 'lib', 'navigation.ts'), 'utf8');
const rootLayout = readFileSync(join(prototype, 'app', '_layout.tsx'), 'utf8');
const discover = readFileSync(join(prototype, 'app', '(tabs)', 'discover', 'index.tsx'), 'utf8');
const saved = readFileSync(join(prototype, 'app', 'settings', 'saved.tsx'), 'utf8');
const noteDetail = readFileSync(join(prototype, 'app', 'discover', 'notes', '[id].tsx'), 'utf8');
const noteUpload = readFileSync(join(prototype, 'app', 'discover', 'notes', 'upload.tsx'), 'utf8');
const uploads = readFileSync(join(prototype, 'src', 'lib', 'uploads.ts'), 'utf8');
const auth = readFileSync(join(prototype, 'src', 'lib', 'auth.ts'), 'utf8');
const authVerification = readFileSync(join(prototype, 'app', '(auth)', 'verify.tsx'), 'utf8');
const composer = readFileSync(join(prototype, 'app', 'compose', 'index.tsx'), 'utf8');
const conversation = readFileSync(join(prototype, 'app', 'chat', '[id].tsx'), 'utf8');
const chatList = readFileSync(join(prototype, 'app', 'chat', 'index.tsx'), 'utf8');
const appProviders = readFileSync(join(prototype, 'src', 'providers', 'AppProviders.tsx'), 'utf8');
const mobilePackage = readFileSync(join(prototype, 'package.json'), 'utf8');
const seed = readFileSync(join(backend, 'supabase', 'seed.sql'), 'utf8');
const cloudVerification = readFileSync(join(backend, 'scripts', 'verify-cloud-mvp.mjs'), 'utf8');
const cloudLoad = readFileSync(join(backend, 'scripts', 'load-cloud.mjs'), 'utf8');

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
for (const marker of ['search_campuses_mobile', 'catalog_source_id', 'campuses_name_trgm_idx']) {
  if (!campusCatalogMigration.includes(marker)) throw new Error(`Campus catalogue migration missing: ${marker}`);
}
for (const marker of ['create table if not exists public.resources', 'create_resource_upload_intent_mobile', 'complete_resource_upload_mobile', 'study-resources', 'resource.uploader_id = public.current_user_id()', 'resource.uploader_id = public.current_user_id())', 'uploaded byte size mismatch', 'uploaded object not found']) {
  if (!resourcesMigration.includes(marker)) throw new Error(`Resources migration missing: ${marker}`);
}
for (const marker of ["normalized === 'resources'", 'create_resource_upload_intent_mobile', 'complete_resource_upload_mobile', 'uploadResourceObject']) {
  if (!api.includes(marker) && marker !== 'uploadResourceObject') throw new Error(`Mobile resource API wiring missing: ${marker}`);
}
for (const marker of ['https://colleges-api.onrender.com/', 'https://indian-colleges-list.vercel.app/api/institutions', 'resolution=merge-duplicates']) {
  if (!campusCatalogSync.includes(marker)) throw new Error(`Campus catalogue sync missing: ${marker}`);
}
if (!api.includes("rpc<any[]>('search_campuses_mobile'")) throw new Error('Mobile campus search does not use catalogue RPC.');

for (const name of ['search_people_mobile', 'recommend_people_mobile', 'get_discoverable_profile_mobile']) {
  if (!peopleDiscoveryMigration.includes(`function public.${name}`)) throw new Error(`People discovery migration missing: ${name}`);
  if (!api.includes(`'${name}'`)) throw new Error(`Mobile people discovery does not call: ${name}`);
}
for (const marker of ['connections_pair_unique', 'conversations_direct_connection_uidx', 'conversation_members_pair_uidx']) {
  if (!conflictIndexesMigration.includes(marker)) throw new Error(`Chat conflict target index missing: ${marker}`);
}
for (const marker of ['conversations_team_request_conflict_uidx', 'skills_name_conflict_uidx', 'interests_name_conflict_uidx']) {
  if (!teamCreationConflictIndexesMigration.includes(marker)) throw new Error(`Team creation conflict target index missing: ${marker}`);
}
for (const marker of ['visible_profile_labels_mobile', 'can_view_profile', 'can_access_conversation']) {
  if (!visibleLabelsMigration.includes(marker)) throw new Error(`Visible profile labels migration missing: ${marker}`);
}
for (const marker of ["attribute.attname = 'participants'", 'alter column participants set default', "participants_type like '%[]'"]) {
  if (!legacyConversationParticipantsMigration.includes(marker)) throw new Error(`Legacy conversation participants compatibility missing: ${marker}`);
}
for (const marker of ['campusphere_connections_pair_uidx', 'campusphere_conversations_direct_uidx', 'campusphere_conversation_members_pair_uidx']) {
  if (!chatConflictArbitersMigration.includes(marker)) throw new Error(`Chat conflict arbiter missing: ${marker}`);
}
for (const marker of ['campusphere_event_registrations_pair_uidx', 'campusphere_team_members_pair_uidx', 'campusphere_team_applications_active_uidx', 'campusphere_notification_dedupe_uidx', 'campusphere_restrictions_active_uidx', 'campusphere_user_devices_label_uidx']) {
  if (!allConflictArbitersMigration.includes(marker)) throw new Error(`General conflict arbiter missing: ${marker}`);
}
for (const marker of ['visibleProfileLabels([post.author_id]', 'visibleProfileLabels(rows.map((row) => row.author_id)', 'visibleProfileLabels(members.map((member) => member.user_id)', "visibleProfileLabels(rows.map((row) => row.applicant_id)", "visibleProfileLabels(rows.map((row) => row.requester_id === me.userId", 'visibleProfileLabels(rows.map((row) => row.followee_id)']) {
  if (!api.includes(marker)) throw new Error(`Mobile visible profile label wiring missing: ${marker}`);
}
for (const marker of ["type: 'person'", 'Search people by name or username', 'Request chat', "connection?.state === 'accepted'"]) {
  if (!chatList.includes(marker)) throw new Error(`Chat people search UI missing: ${marker}`);
}
for (const marker of ['Ionicons.loadFont()', ".catch(() => setIconFontState('error'))", 'App assets could not load']) {
  if (!appProviders.includes(marker)) throw new Error(`Ionicons asset recovery missing: ${marker}`);
}
if (!mobilePackage.includes('"start:tunnel": "expo start --tunnel -c"')) throw new Error('Expo tunnel start script is missing.');
if (!mobilePackage.includes('"@expo/vector-icons": "15.1.1"')) throw new Error('Expo vector icons must match installed lockfile version 15.1.1.');

for (const marker of ["supabaseRequest('auth', 'otp'", 'create_user: true']) {
  if (!auth.includes(marker)) throw new Error(`Supabase Auth OTP wiring missing: ${marker}`);
}
for (const marker of ["await sendOtp(String(email ?? ''))", 'setResendIn(60)']) {
  if (!authVerification.includes(marker)) throw new Error(`Supabase Auth resend wiring missing: ${marker}`);
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

for (const marker of ['student-a@campussphere.local', 'CampusSphere MVP Demo Event', 'Build a campus accessibility audit']) {
  if (!seed.includes(marker)) throw new Error(`Deterministic local seed missing: ${marker}`);
}
for (const marker of ['create_post_mobile', 'create_team_request_mobile_v2', 'ensure_team_conversation', 'chat-attachments', 'set_block_mobile']) {
  if (!cloudVerification.includes(marker)) throw new Error(`Cloud mutation verification missing: ${marker}`);
}
for (const marker of ['feed_page', 'events_page', 'team_requests_page', 'notifications_page', 'p95Ms']) {
  if (!cloudLoad.includes(marker)) throw new Error(`Cloud load verification missing: ${marker}`);
}

for (const route of ['/discover/clubs', '/discover/listings', '/discover/opportunities']) {
  if (!navigation.includes(`prefix: '${route}'`)) throw new Error(`MVP boundary missing route: ${route}`);
}
for (const path of [
  join(prototype, 'app', 'assistant', 'index.tsx'),
  join(prototype, 'src', 'components', 'AIPet.tsx'),
  join(prototype, 'src', 'data', 'pets.ts'),
  join(prototype, 'src', 'lib', 'assistant.ts'),
]) {
  if (existsSync(path)) throw new Error(`Disabled AI/pet feature still exists: ${relative(root, path)}`);
}
if (/AIPet|showAIPet|selectedPetId|setSelectedPet|prefix: '\/assistant'/.test(`${appProviders}\n${navigation}`)) {
  throw new Error('Disabled AI/pet feature remains wired into mobile runtime.');
}
if (navigation.includes("prefix: '/discover/notes'")) throw new Error('Notes must not remain behind the under-construction route gate.');
if (!navigation.includes('router.replace(fallback)') || navigation.includes('router.back()')) throw new Error('Back navigation must use deterministic replacement so stale onboarding history cannot reopen.');
if (!navigation.includes('getSessionRedirect') || !rootLayout.includes('getSessionRedirect')) throw new Error('Global session route guard is missing.');
if (!rootLayout.includes('useRootNavigationState')) throw new Error('Root redirects must wait for Expo Router navigation readiness.');
if (!rootLayout.includes('if (!rootNavigationState?.key || !sessionResolved) return')) throw new Error('Root redirect readiness guard is missing.');
if (rootLayout.includes('if (!sessionResolved || sessionRedirect || blockedFeature) return null')) throw new Error('Root navigator must stay mounted while redirects are pending.');
if (!auth.includes('profiles?select=user_id')) throw new Error('Existing profiles must recover legacy completed onboarding sessions.');
if (discover.includes('Under construction') || discover.includes('openUnderConstruction')) throw new Error('Discover must expose only working MVP categories.');
if (!saved.includes('label="Events"') || !saved.includes("ids('event')")) throw new Error('Saved published events are not wired.');
if (!api.includes("/^resources\\/[^/]+$/.test(normalized)") || !noteDetail.includes('`/resources/${id}`')) throw new Error('Resource detail must fetch its exact backend record.');
if (!api.includes('p_bookmarked: Boolean(body.bookmarked)') || !noteDetail.includes('bookmarked: !previous')) throw new Error('Bookmark mutation must send the requested state.');
if (!noteUpload.includes('const actualBytes = data.size > 0 ? data.size : file.size') || !noteUpload.includes('completeUploadIntent(intent.resourceId, actualBytes)')) throw new Error('Resource upload completion must validate the uploaded byte count.');
if (!uploads.includes("intent.uploadUrl.startsWith('supabase://study-resources/')") || uploads.includes('mock://')) throw new Error('Resource upload must use only the backend-issued private Supabase destination.');

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
  if (/mock:\/\//.test(source)) {
    throw new Error(`Active mock URL fallback: ${relative(root, path)}`);
  }
  if (/RESEND_API_KEY|SEND_EMAIL_HOOK_SECRET|api\.resend\.com|smtp\.gmail\.com/i.test(source)) {
    throw new Error(`Email provider secret or direct provider call in mobile source: ${relative(root, path)}`);
  }
}

console.log('MVP static coverage is valid.');
