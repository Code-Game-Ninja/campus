import {
  createStorageSignedUrl,
  deleteStorageObject,
  postgrestQuery,
  SupabaseHttpError,
  supabaseRequest,
  uploadStorageObject,
} from './supabase-http';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'supabase://campussphere').replace(/\/+$/, '');
const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';
const POST_MEDIA_BUCKET = 'post-media';

let accessToken: string | null = null;
let unauthorizedHandler: (() => Promise<boolean>) | null = null;
const accessTokenListeners = new Set<(token: string | null) => void>();

export function setAccessToken(token: string | null): void {
  if (accessToken === token) return;
  accessToken = token;
  for (const listener of accessTokenListeners) listener(token);
}
export function getAccessToken(): string | null { return accessToken; }
export function subscribeAccessToken(listener: (token: string | null) => void): () => void {
  accessTokenListeners.add(listener);
  return () => accessTokenListeners.delete(listener);
}
export function registerUnauthorizedHandler(handler: () => Promise<boolean>): void { unauthorizedHandler = handler; }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof SupabaseHttpError) return new ApiError(error.message, error.status, error.code);
  return new ApiError(error instanceof Error ? error.message : 'Backend request failed.', 0);
}

async function withAuth<T>(operation: (token: string) => Promise<T>, retry401 = true): Promise<T> {
  let token = accessToken;
  if (!token) throw new ApiError('Authentication is required.', 401, 'AUTH_REQUIRED');
  try {
    return await operation(token);
  } catch (error) {
    const apiError = toApiError(error);
    if (retry401 && apiError.status === 401 && unauthorizedHandler && await unauthorizedHandler()) {
      token = accessToken;
      if (token) return operation(token);
    }
    throw apiError;
  }
}

async function select<T>(table: string, query: string, token: string): Promise<T[]> {
  return supabaseRequest<T[]>('rest', `${table}${query}`, { accessToken: token, headers: { Prefer: 'return=representation' } });
}

async function rpc<T>(name: string, body: Record<string, unknown>, token: string): Promise<T> {
  return supabaseRequest<T>('rest', `rpc/${name}`, { method: 'POST', accessToken: token, body });
}

function pathParts(path: string): string[] { return path.split('/').filter(Boolean); }
function resourceId(path: string): string {
  const parts = pathParts(path);
  const collectionIndex = parts.findIndex((part) => ['posts', 'events', 'team-requests', 'connections', 'rooms', 'messages', 'notifications', 'blocks'].includes(part));
  return collectionIndex >= 0 ? parts[collectionIndex + 1] ?? '' : parts.at(-1) ?? '';
}
function finalId(path: string): string { return pathParts(path).at(-1) ?? ''; }
function decodeCursor(value: unknown): { timestamp: string | null; id: string | null } {
  if (typeof value !== 'string' || !value) return { timestamp: null, id: null };
  const [timestamp, id] = decodeURIComponent(value).split('|');
  return timestamp && id ? { timestamp, id } : { timestamp: null, id: null };
}
function encodeCursor(row: any, timestampField: string): string | null {
  return row?.[timestampField] && row?.id ? encodeURIComponent(`${row[timestampField]}|${row.id}`) : null;
}

function mapProfile(user: any, profile: any, skills: any[] = [], interests: any[] = [], links: any[] = [], viewerId?: string, viewerCampusId?: string) {
  return {
    userId: user?.id ?? profile?.user_id,
    displayName: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_key ?? null,
    course: profile?.course ?? null,
    department: profile?.department ?? null,
    studyYear: profile?.study_year ?? null,
    graduationYear: profile?.graduation_year ?? null,
    location: profile?.location_text ?? null,
    availability: profile?.availability ?? {},
    profileVisibility: profile?.profile_visibility ?? 'private',
    bio: profile?.bio ?? null,
    skills: skills.map((row) => row.skills?.name ?? row.name).filter(Boolean),
    interests: interests.map((row) => row.interests?.name ?? row.name).filter(Boolean),
    links: links.map((row) => ({ label: row.link_type, url: row.url })),
    discoverable: Boolean(profile?.discoverable),
    isSelf: user?.id === viewerId || profile?.user_id === viewerId,
    isCrossCampus: Boolean(viewerCampusId && user?.campus_id && viewerCampusId !== user.campus_id),
  };
}

function mapPostRow(post: any, viewerId: string, commentCount = 0) {
  const media = (post.post_media ?? []).sort((a: any, b: any) => a.display_order - b.display_order);
  const link = media.find((row: any) => row.media_type === 'link' && row.url);
  return {
    id: post.id,
    scope: post.visibility === 'global' ? 'global' : 'campus',
    authorMode: 'named',
    author: { userId: post.author_id, displayName: post.author?.display_name ?? 'Campus member', avatarUrl: post.author?.avatar_key ?? null },
    title: post.title ?? null,
    body: post.body,
    kind: post.post_kind ?? 'discussion',
    visibility: post.visibility,
    reactions: { like: post.post_reactions?.length ?? 0, celebrate: 0, insightful: 0, support: 0 },
    commentCount,
    publishedAt: post.created_at,
    editedAt: post.edited_at,
    whyThis: [],
    version: 1,
    viewerReaction: post.post_reactions?.some((row: any) => row.user_id === viewerId) ? 'like' : null,
    viewerBookmarked: post.post_bookmarks?.some((row: any) => row.user_id === viewerId),
    mediaUrls: media.filter((row: any) => row.media_type !== 'link').map((row: any) => row.url).filter(Boolean),
    mediaItems: media.filter((row: any) => row.media_type !== 'link' && row.url).map((row: any) => ({ url: row.url, type: row.media_type, name: row.metadata?.fileName ?? null })),
    linkPreview: link ? { url: link.url, title: link.metadata?.title ?? link.url, description: link.metadata?.description ?? null } : null,
    poll: post.poll_state ?? null,
    eventId: post.event_id,
    teamRequestId: post.team_request_id,
    recruitment: Boolean(post.team_request_id),
  };
}

async function resolvePostMedia(rows: any[], token: string): Promise<any[]> {
  return Promise.all(rows.map(async (row) => {
    if (row.url || !row.storage_key) return row;
    try {
      return { ...row, url: await createStorageSignedUrl(POST_MEDIA_BUCKET, row.storage_key, token, 3600) };
    } catch {
      return row;
    }
  }));
}

function mapTeamRow(row: any, viewerId: string, application?: any) {
  return {
    id: row.id, scope: 'campus', goalType: row.team_type, title: row.title, description: row.description,
    neededTags: row.team_request_skills?.map((item: any) => item.skills?.name).filter(Boolean) ?? [],
    timeWindowStart: row.application_deadline, timeWindowEnd: row.target_completion_date,
    capacity: row.desired_member_count, applicationPrompt: row.custom_questions?.[0] ?? null,
    status: row.status === 'open' ? 'open' : 'closed', version: 1, ownerId: row.owner_id,
    isOwner: row.owner_id === viewerId, myApplicationId: application?.id ?? null,
    myApplicationState: application?.status === 'accepted' ? 'accepted' : application?.status === 'rejected' ? 'declined' : application?.status === 'pending' ? 'pending' : null,
    myApplicationKind: application ? (application.application_kind === 'invitation' ? 'invitation' : 'application') : null, createdAt: row.created_at,
  };
}

function mapApplicationRow(row: any) {
  return {
    id: row.id, teamRequestId: row.team_request_id, applicantId: row.applicant_id,
    applicantDisplayName: row.applicant?.display_name ?? null, teamTitle: row.team?.title ?? null,
    responseText: row.message || null, kind: row.application_kind === 'invitation' ? 'invitation' : 'application',
    state: row.status === 'accepted' ? 'accepted' : row.status === 'rejected' ? 'declined' : row.status === 'withdrawn' ? 'withdrawn' : row.status === 'cancelled' ? 'cancelled' : 'pending',
    createdAt: row.created_at, respondedAt: row.decided_at,
  };
}

async function attachTeamSkills(row: any, token: string): Promise<any> {
  const links = await select<any>('team_request_skills', postgrestQuery({ select: 'skill_id', team_request_id: `eq.${row.id}` }), token);
  const names = await Promise.all(links.map(async (link) => {
    const skills = await select<any>('skills', postgrestQuery({ select: 'name', id: `eq.${link.skill_id}` }), token);
    return skills[0]?.name;
  }));
  return { ...row, team_request_skills: names.filter(Boolean).map((name) => ({ skills: { name } })) };
}

async function mapConversationRow(row: any, token: string, viewerId: string) {
  const members = await select<any>('conversation_members', postgrestQuery({ select: '*', conversation_id: `eq.${row.id}` }), token);
  const displayNames = new Map<string, string>();
  await Promise.all(members.map(async (member) => {
    const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${member.user_id}` }), token);
    displayNames.set(member.user_id, profiles[0]?.display_name ?? 'Campus member');
  }));
  const mine = members.find((member) => member.user_id === viewerId);
  const unread = row.last_message_time && (!mine?.last_read_at || new Date(row.last_message_time) > new Date(mine.last_read_at)) && row.last_message_sender !== viewerId ? 1 : 0;
  return {
    id: row.id, campusId: row.campus_id, type: row.type === 'direct' ? 'dm' : row.type,
    name: row.name, teamRequestId: row.team_request_id, eventId: row.event_id,
    createdAt: row.created_at, updatedAt: row.updated_at, lastMessagePreview: row.last_message_preview,
    lastMessageTime: row.last_message_time, unreadCount: unread, muted: mine?.notification_mode === 'muted',
    members: members.map((member) => ({ id: member.id, roomId: row.id, userId: member.user_id,
      displayName: displayNames.get(member.user_id), role: member.role, joinedAt: member.joined_at,
      leftAt: member.left_at, lastReadAt: member.last_read_at })),
  };
}

function mapConnectionRow(row: any, viewerId: string, otherProfile?: any, viewerCampusId?: string) {
  const otherUserId = row.requester_id === viewerId ? row.addressee_id : row.requester_id;
  return {
    id: row.id, otherUserId, otherDisplayName: otherProfile?.display_name ?? null,
    isCrossCampus: Boolean(viewerCampusId && otherProfile?.campus_id && otherProfile.campus_id !== viewerCampusId),
    origin: 'profile', direction: row.requester_id === viewerId ? 'outgoing' : 'incoming',
    state: row.status === 'removed' || row.status === 'cancelled' ? 'ended' : row.status,
    createdAt: row.created_at, acceptedAt: row.status === 'accepted' ? row.responded_at : null,
    endedAt: ['removed', 'cancelled'].includes(row.status) ? row.responded_at : null,
  };
}

function mapMessageRow(row: any) {
  return {
    id: row.id, campusId: row.campus_id ?? null, roomId: row.conversation_id,
    senderId: row.sender_id, clientMessageId: row.client_message_id, content: row.text,
    messageType: row.message_type, linkUrl: row.link_url, replyToMessageId: row.reply_to_message_id,
    metadata: row.metadata ?? {}, status: row.status, contentUnavailable: false,
    attachments: (row.message_attachments ?? []).map((attachment: any) => ({
      id: attachment.id, messageId: attachment.message_id, fileName: attachment.file_name,
      mimeType: attachment.mime_type, bytes: attachment.byte_size, storageKey: attachment.storage_key,
      scanStatus: attachment.scan_status,
    })),
    createdAt: row.created_at, editedAt: row.edited_at ?? null, deletedAt: row.deleted_at ?? null,
  };
}

async function getMe(token: string): Promise<any> {
  const session = await supabaseRequest<any>('auth', 'user', { accessToken: token });
  const users = await select<any>('users', postgrestQuery({ select: 'id,campus_id,status,onboarding_completed_at', id: `eq.${session.id}` }), token);
  const user = users[0] ?? { id: session.id, campus_id: null };
  return { userId: session.id, campusId: user.campus_id, status: user.status, onboardingCompleted: Boolean(user.onboarding_completed_at) };
}

async function getProfile(userId: string, token: string): Promise<any> {
  const me = await getMe(token);
  const users = await select<any>('users', postgrestQuery({ select: 'id,campus_id,status', id: `eq.${userId}` }), token);
  const profiles = await select<any>('profiles', postgrestQuery({ select: '*', user_id: `eq.${userId}` }), token);
  const skills = await select<any>('profile_skills', postgrestQuery({ select: 'skills(name)', user_id: `eq.${userId}` }), token);
  const interests = await select<any>('profile_interests', postgrestQuery({ select: 'interests(name)', user_id: `eq.${userId}` }), token);
  const links = await select<any>('profile_links', postgrestQuery({ select: 'link_type,url', user_id: `eq.${userId}`, order: 'display_order.asc' }), token);
  return mapProfile(users[0], profiles[0], skills, interests, links, me.userId, me.campusId);
}

async function getEvent(eventId: string, token: string): Promise<any> {
  const me = await getMe(token);
  const rows = await select<any>('events', postgrestQuery({ select: '*,event_organizers(id,display_name)', id: `eq.${eventId}` }), token);
  const event = rows[0];
  if (!event) return null;
  const registrations = await select<any>('event_registrations', postgrestQuery({ select: 'status', event_id: `eq.${eventId}`, user_id: `eq.${me.userId}` }), token);
  const reminder = await select<any>('event_reminders', postgrestQuery({ select: 'status', event_id: `eq.${eventId}`, user_id: `eq.${me.userId}` }), token);
  const bookmark = await select<any>('event_bookmarks', postgrestQuery({ select: 'event_id', event_id: `eq.${eventId}`, user_id: `eq.${me.userId}` }), token);
  const registeredCount = await rpc<number>('event_registered_count', { target_event_id: eventId }, token);
  return {
    id: event.id, campusId: event.campus_id, organizerId: event.organizer_id,
    organizerName: event.event_organizers?.display_name, title: event.title,
    description: event.description, location: event.venue_name ?? event.address_text ?? '',
    bannerUrl: event.cover_key, category: event.category, timezone: event.timezone,
    onlineUrl: event.public_url, registrationDeadline: event.registration_deadline,
    contact: null, accessibilityNotes: null, terms: null, photoUrls: [],
    startTime: event.starts_at, endTime: event.ends_at, capacity: event.capacity,
    registeredCount, status: event.status, createdAt: event.created_at, updatedAt: event.updated_at,
    userRegistrationStatus: registrations[0]?.status ?? null, reminderEnabled: reminder[0]?.status === 'scheduled', viewerBookmarked: bookmark.length > 0,
  };
}

export async function apiGet<T>(path: string, query: Record<string, string | number | undefined | null> = {}, retry401 = true): Promise<T> {
  return withAuth(async (token) => {
    const normalized = path.replace(/^\/+|\/+$/g, '');
    if (normalized === 'me') return getMe(token) as Promise<T>;
    if (normalized.startsWith('profiles/')) return getProfile(finalId(normalized) === 'me' ? (await getMe(token)).userId : finalId(normalized), token) as Promise<T>;
    if (normalized === 'events') {
      const cursor = decodeCursor(query.cursor);
      const rows = await rpc<any[]>('events_page', { p_limit: Number(query.limit ?? 100), p_after_starts_at: cursor.timestamp, p_after_id: cursor.id }, token);
      return Promise.all(rows.map((event) => getEvent(event.id, token))) as Promise<T>;
    }
    if (/^events\/[^/]+$/.test(normalized)) return getEvent(resourceId(normalized), token) as Promise<T>;
    if (normalized === 'posts' || normalized === 'feed') {
      const me = await getMe(token);
      const limit = Number(query.limit ?? 30);
      const cursor = decodeCursor(query.cursor);
      const page = await rpc<any[]>('feed_page', { p_limit: limit + 1, p_before_created_at: cursor.timestamp, p_before_id: cursor.id }, token);
      const rows = page.slice(0, limit);
      const items = await Promise.all(rows.map(async (post) => {
        const [authors, comments, reactions, bookmarks, rawMedia, pollState] = await Promise.all([
          select<any>('profiles', postgrestQuery({ select: 'display_name,avatar_key', user_id: `eq.${post.author_id}` }), token),
          select<any>('comments', postgrestQuery({ select: 'id', post_id: `eq.${post.id}`, status: 'eq.published' }), token),
          select<any>('post_reactions', postgrestQuery({ select: 'reaction_type,user_id', post_id: `eq.${post.id}` }), token),
          select<any>('post_bookmarks', postgrestQuery({ select: 'user_id', post_id: `eq.${post.id}` }), token),
          select<any>('post_media', postgrestQuery({ select: 'media_type,storage_key,url,metadata,display_order', post_id: `eq.${post.id}`, moderation_status: 'neq.rejected' }), token),
          rpc<any>('post_poll_state_mobile', { p_post_id: post.id }, token),
        ]);
        const media = await resolvePostMedia(rawMedia, token);
        return mapPostRow({ ...post, author: authors[0], post_reactions: reactions, post_bookmarks: bookmarks, post_media: media, poll_state: pollState }, me.userId, comments.length);
      }));
      return { items, nextCursor: page.length > limit ? encodeCursor(rows.at(-1), 'created_at') : null } as T;
    }
    if (/^posts\/[^/]+$/.test(normalized)) {
      const me = await getMe(token);
      const rows = await select<any>('posts', postgrestQuery({ select: '*,post_reactions(reaction_type,user_id),post_bookmarks(user_id)', id: `eq.${resourceId(normalized)}` }), token);
      if (!rows[0]) return null as T;
      const [authors, comments, rawMedia, pollState] = await Promise.all([
        select<any>('profiles', postgrestQuery({ select: 'display_name,avatar_key', user_id: `eq.${rows[0].author_id}` }), token),
        select<any>('comments', postgrestQuery({ select: 'id', post_id: `eq.${rows[0].id}`, status: 'eq.published' }), token),
        select<any>('post_media', postgrestQuery({ select: 'media_type,storage_key,url,metadata,display_order', post_id: `eq.${rows[0].id}`, moderation_status: 'neq.rejected' }), token),
        rpc<any>('post_poll_state_mobile', { p_post_id: rows[0].id }, token),
      ]);
      const media = await resolvePostMedia(rawMedia, token);
      return mapPostRow({ ...rows[0], author: authors[0], post_media: media, poll_state: pollState }, me.userId, comments.length) as T;
    }
    if (/^posts\/[^/]+\/comments$/.test(normalized)) {
      const rows = await select<any>('comments', postgrestQuery({ select: '*', post_id: `eq.${resourceId(normalized)}`, status: 'eq.published', order: 'created_at.asc', limit: query.limit ?? 100 }), token);
      const items = await Promise.all(rows.map(async (row) => {
        const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name,avatar_key', user_id: `eq.${row.author_id}` }), token);
        return { id: row.id, postId: row.post_id, parentId: row.parent_comment_id, author: { userId: row.author_id, displayName: profiles[0]?.display_name ?? 'Campus member', avatarUrl: profiles[0]?.avatar_key ?? null }, body: row.body, createdAt: row.created_at };
      }));
      return { items, nextCursor: null } as T;
    }
    if (normalized === 'team-requests') { const me = await getMe(token); const limit = Number(query.limit ?? 30); const cursor = decodeCursor(query.cursor); const page = await rpc<any[]>('team_requests_page', { p_limit: limit + 1, p_before_created_at: cursor.timestamp, p_before_id: cursor.id }, token); const rows = page.slice(0, limit); const items = await Promise.all(rows.map(async (raw) => { const row = await attachTeamSkills(raw, token); const apps = await select<any>('team_applications', postgrestQuery({ select: '*', team_request_id: `eq.${row.id}`, applicant_id: `eq.${me.userId}`, order: 'created_at.desc', limit: 1 }), token); return mapTeamRow(row, me.userId, apps[0]); })); return { items, nextCursor: page.length > limit ? encodeCursor(rows.at(-1), 'created_at') : null } as T; }
    if (normalized === 'team-requests/invitations/mine') { const me = await getMe(token); const rows = await select<any>('team_applications', postgrestQuery({ select: '*', applicant_id: `eq.${me.userId}`, application_kind: 'eq.invitation', status: 'eq.pending', order: 'created_at.desc' }), token); const items = await Promise.all(rows.map(async (row) => { const teams = await select<any>('team_requests', postgrestQuery({ select: 'title', id: `eq.${row.team_request_id}` }), token); return mapApplicationRow({ ...row, applicant: { display_name: 'You' }, team: teams[0] }); })); return items as T; }
    if (/^team-requests\/[^/]+$/.test(normalized)) { const me = await getMe(token); const rows = await select<any>('team_requests', postgrestQuery({ select: '*', id: `eq.${resourceId(normalized)}` }), token); if (!rows[0]) return null as T; const row = await attachTeamSkills(rows[0], token); const apps = await select<any>('team_applications', postgrestQuery({ select: '*', team_request_id: `eq.${row.id}`, applicant_id: `eq.${me.userId}`, order: 'created_at.desc', limit: 1 }), token); return mapTeamRow(row, me.userId, apps[0]) as T; }
    if (/^team-requests\/[^/]+\/applications$/.test(normalized)) { const rows = await select<any>('team_applications', postgrestQuery({ select: '*', team_request_id: `eq.${resourceId(normalized)}`, order: 'created_at.asc' }), token); const items = await Promise.all(rows.map(async (row) => { const [profiles, teams] = await Promise.all([select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${row.applicant_id}` }), token), select<any>('team_requests', postgrestQuery({ select: 'title', id: `eq.${row.team_request_id}` }), token)]); return mapApplicationRow({ ...row, applicant: profiles[0], team: teams[0] }); })); return items as T; }
    if (normalized === 'connections') { const me = await getMe(token); const rows = await select<any>('connections', postgrestQuery({ select: '*', or: `(requester_id.eq.${me.userId},addressee_id.eq.${me.userId})`, order: 'updated_at.desc' }), token); const items = await Promise.all(rows.map(async (row) => { const otherId = row.requester_id === me.userId ? row.addressee_id : row.requester_id; const [profiles, users] = await Promise.all([select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${otherId}` }), token), select<any>('users', postgrestQuery({ select: 'campus_id', id: `eq.${otherId}` }), token)]); return mapConnectionRow(row, me.userId, { ...profiles[0], ...users[0] }, me.campusId); })); return items as T; }
    if (normalized === 'chat/rooms') { const me = await getMe(token); const rows = await select<any>('conversations', postgrestQuery({ select: '*', order: 'updated_at.desc' }), token); return Promise.all(rows.map((row) => mapConversationRow(row, token, me.userId))) as Promise<T>; }
    if (/^chat\/rooms\/[^/]+$/.test(normalized)) { const me = await getMe(token); const rows = await select<any>('conversations', postgrestQuery({ select: '*', id: `eq.${resourceId(normalized)}` }), token); return rows[0] ? mapConversationRow(rows[0], token, me.userId) as Promise<T> : null as T; }
    if (/^chat\/rooms\/[^/]+\/messages$/.test(normalized)) { const rows = await select<any>('messages', postgrestQuery({ select: '*,message_attachments(*)', conversation_id: `eq.${resourceId(normalized)}`, status: 'eq.visible', order: 'created_at.desc', limit: query.limit ?? 100 }), token); return { items: rows.map(mapMessageRow), nextCursor: null } as T; }
    if (normalized === 'notifications') { const cursor = decodeCursor(query.cursor); const rows = await rpc<any[]>('notifications_page', { p_limit: Number(query.limit ?? 100), p_before_created_at: cursor.timestamp, p_before_id: cursor.id, p_unread_only: query.unreadOnly === 'true' }, token); return rows.map((row) => ({ id: row.id, recipientId: row.user_id, eventType: row.type, title: row.payload?.title ?? row.type, body: row.payload?.body ?? '', read: Boolean(row.in_app_read_at), referenceType: row.subject_type, referenceId: row.subject_id, createdAt: row.created_at })) as T; }
    if (normalized === 'notifications/preferences') { const me = await getMe(token); const rows = await select<any>('notification_preferences', postgrestQuery({ select: '*', user_id: `eq.${me.userId}` }), token); const row = rows[0] ?? { user_id: me.userId, in_app_enabled: true, push_enabled: false, email_enabled: true, category_settings: {}, updated_at: new Date(0).toISOString() }; const eventTypes = ['post_reaction', 'comment', 'event_reminder', 'club_update', 'chat_message', 'security_alert']; return eventTypes.map((eventType) => { const category = row.category_settings?.[eventType] ?? {}; return { id: `${row.user_id}:${eventType}`, campusId: me.campusId, userId: row.user_id, eventType, inApp: category.in_app ?? row.in_app_enabled, push: category.push ?? row.push_enabled, emailDigest: category.email ?? row.email_enabled, updatedAt: row.updated_at }; }) as T; }
    if (normalized === 'blocks') { return select<any>('user_blocks', postgrestQuery({ select: 'blocked_id,created_at', order: 'created_at.desc' }), token).then((rows) => rows.map((row) => ({ blockedUserId: row.blocked_id, createdAt: row.created_at }))) as Promise<T>; }
    if (normalized === 'follows') { const me = await getMe(token); const rows = await select<any>('following', postgrestQuery({ select: 'followee_id,created_at', follower_id: `eq.${me.userId}`, order: 'created_at.desc' }), token); const items = await Promise.all(rows.map(async (row) => { const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${row.followee_id}` }), token); return { targetType: 'person', targetId: row.followee_id, displayName: profiles[0]?.display_name ?? 'Campus member', followedAt: row.created_at }; })); return items as T; }
    if (normalized === 'recommendations') { const me = await getMe(token); const rows = await select<any>('profiles', postgrestQuery({ select: 'user_id,display_name,department', discoverable: 'eq.true', user_id: `neq.${me.userId}`, limit: query.limit ?? 30 }), token); const items = await Promise.all(rows.map(async (row) => { const skills = await select<any>('profile_skills', postgrestQuery({ select: 'skills(name)', user_id: `eq.${row.user_id}` }), token); return { userId: row.user_id, displayName: row.display_name, department: row.department, matchedTags: skills.map((item) => item.skills?.name).filter(Boolean), explanations: ['skill_overlap'] }; })); return items as T; }
    if (normalized === 'search') { const q = String(query.q ?? '').trim(); if (q.length < 2) return { hits: [], degraded: false } as T; const requestedType = String(query.type ?? 'all'); const type = requestedType === 'person' ? 'profile' : requestedType; const hits = await rpc<any[]>('search_mobile', { p_query: q, p_type: type, p_limit: Number(query.limit ?? 40) }, token); return { hits: hits.map((hit) => ({ ...hit, docType: hit.docType === 'profile' ? 'person' : hit.docType })), degraded: false } as T; }
    if (normalized === 'account/requests') { const rows = await select<any>('account_requests', postgrestQuery({ select: '*', order: 'requested_at.desc', limit: 100 }), token); return rows.map((row) => ({ id: row.id, type: row.request_type, status: row.status, targetUniversityId: row.target_campus_id, reason: row.reason, requestedAt: row.requested_at, updatedAt: row.updated_at, completedAt: row.completed_at })) as T; }
    if (normalized === 'bookmarks') { const me = await getMe(token); const [posts, events] = await Promise.all([select<any>('post_bookmarks', postgrestQuery({ select: 'post_id', user_id: `eq.${me.userId}` }), token), select<any>('event_bookmarks', postgrestQuery({ select: 'event_id', user_id: `eq.${me.userId}` }), token)]); return [...posts.map((r) => ({ target_type: 'post', target_id: r.post_id })), ...events.map((r) => ({ target_type: 'event', target_id: r.event_id }))] as T; }
    if (normalized === 'universities') { const rows = await select<any>('campuses', postgrestQuery({ select: 'id,name,slug,country_code,timezone', name: query.q ? `ilike.*${String(query.q)}*` : undefined, status: 'eq.active', limit: query.limit ?? 25 }), token); return { items: rows.map((r) => ({ id: r.id, name: r.name, country: r.country_code, countryCode: r.country_code, domain: null, stateProvince: null })), total: rows.length, limit: Number(query.limit ?? 25), offset: 0 } as T; }
    throw new ApiError(`The CampusSphere backend does not expose /${normalized} yet.`, 501, 'ENDPOINT_NOT_IMPLEMENTED');
  }, retry401);
}

export async function apiRequest<T>(path: string, init: { method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; idempotencyKey?: string; retry401?: boolean; headers?: Record<string, string> }): Promise<T> {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  return withAuth(async (token) => {
    const body: any = init.body ?? {};
    if (normalized === 'profiles/me' && init.method === 'PATCH') return rpc<T>('update_my_profile_mobile', {
      p_display_name: body.displayName, p_username: body.username ?? null, p_course: body.course ?? null,
      p_department: body.department, p_study_year: body.studyYear, p_graduation_year: body.graduationYear ?? null,
      p_avatar_key: body.avatarKey ?? null, p_location: body.location ?? null, p_availability: body.availability ?? null,
      p_bio: body.bio ?? '', p_discoverable: Boolean(body.discoverable), p_profile_visibility: body.profileVisibility ?? null,
      p_age_confirmed: Boolean(body.ageConfirmed), p_terms_accepted: Boolean(body.termsAccepted), p_privacy_accepted: Boolean(body.privacyAccepted), p_skills: body.skills ?? [],
      p_interests: body.interests ?? [], p_link_label: body.links?.[0]?.label ?? null, p_link_url: body.links?.[0]?.url ?? null,
    }, token);
    if (normalized === 'posts' && init.method === 'POST') { const me = await getMe(token); const requestedVisibility = body.visibility ?? body.scope ?? 'campus'; const row = await rpc<any>('create_post_mobile', { p_title: body.title ?? null, p_body: body.body, p_kind: body.kind ?? 'discussion', p_visibility: requestedVisibility === 'public' ? 'global' : requestedVisibility, p_event_id: body.eventId ?? null, p_team_request_id: body.teamRequestId ?? null, p_media: body.media ?? [], p_poll: body.poll ?? null }, token); return mapPostRow({ ...row, author: { display_name: 'You', avatar_key: null } }, me.userId) as T; }
    if (/^posts\/[^/]+\/comments$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('create_comment_mobile', { p_post_id: resourceId(normalized), p_body: body.body, p_parent_comment_id: body.parentId ?? null }, token); return { ...row, postId: row.post_id, parentId: row.parent_comment_id, author: { userId: me.userId, displayName: 'You', avatarUrl: null }, createdAt: row.created_at } as T; }
    if (/^posts\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const row = await rpc<any>('update_post_mobile', { p_post_id: resourceId(normalized), p_body: body.body ?? null, p_visibility: body.visibility ?? null }, token); const me = await getMe(token); return mapPostRow({ ...row, author: { display_name: 'You', avatar_key: null } }, me.userId) as T; }
    if (/^posts\/[^/]+$/.test(normalized) && init.method === 'DELETE') return rpc<T>('delete_post_mobile', { p_post_id: resourceId(normalized) }, token);
    if (/^posts\/[^/]+\/reactions$/.test(normalized)) return rpc<T>('set_post_reaction_mobile', { p_post_id: resourceId(normalized), p_enabled: Boolean(body.enabled) }, token);
    if (/^posts\/[^/]+\/poll-votes\/[^/]+$/.test(normalized) && init.method === 'POST') return rpc<T>('set_post_poll_vote_mobile', { p_option_id: finalId(normalized), p_selected: Boolean(body.selected) }, token);
    if (normalized === 'bookmarks' && init.method === 'POST') return rpc<T>('set_bookmark_mobile', { p_target_type: body.targetType, p_target_id: body.targetId, p_bookmarked: Boolean(body.bookmarked) }, token);
    if (/^events\/[^/]+\/registrations$/.test(normalized)) return rpc<T>(init.method === 'POST' ? 'register_for_event' : 'cancel_event_registration', { target_event_id: resourceId(normalized) }, token);
    if (/^events\/[^/]+\/reminders$/.test(normalized)) return rpc<T>('set_event_reminder_mobile', { p_event_id: resourceId(normalized), p_enabled: init.method !== 'DELETE', p_minutes_before: body.minutesBefore ?? 1440 }, token);
    if (normalized === 'team-requests' && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('create_team_request_mobile_v2', { p_title: body.title, p_description: body.description, p_team_type: body.goalType ?? 'project', p_desired_member_count: body.capacity ?? 4, p_required_skills: body.neededTags ?? [], p_preferred_skills: body.preferredSkills ?? [], p_interests: body.interests ?? [], p_commitment_level: body.commitmentLevel ?? 'flexible', p_availability: body.availability ?? {}, p_application_deadline: body.applicationDeadline ?? null, p_target_completion_date: body.targetCompletionDate ?? null, p_custom_questions: body.applicationPrompt ? [body.applicationPrompt] : (body.customQuestions ?? []) }, token); return mapTeamRow(await attachTeamSkills(row, token), me.userId) as T; }
    if (/^team-requests\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const me = await getMe(token); const row = await rpc<any>('update_team_request_mobile', { target_team_request_id: resourceId(normalized), p_title: body.title ?? null, p_description: body.description ?? null, p_status: body.status ?? null, p_skills: body.neededTags ?? null }, token); return mapTeamRow(await attachTeamSkills(row, token), me.userId) as T; }
    if (/^team-requests\/[^/]+\/applications$/.test(normalized) && init.method === 'POST') { const row = await rpc<any>('apply_to_team_mobile', { p_team_request_id: resourceId(normalized), p_message: body.responseText ?? '', p_selected_skills: body.selectedSkills ?? [], p_answers: body.answers ?? {} }, token); return mapApplicationRow({ ...row, applicant: { display_name: 'You' } }) as T; }
    if (/^team-requests\/[^/]+\/invitations$/.test(normalized) && init.method === 'POST') { const row = await rpc<any>('invite_to_team', { target_team_request_id: resourceId(normalized), target_user_id: body.targetUserId }, token); const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${row.applicant_id}` }), token); return mapApplicationRow({ ...row, applicant: profiles[0] }) as T; }
    if (/^team-requests\/[^/]+\/applications\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const row = await rpc<any>('decide_team_application', { target_application_id: finalId(normalized), decision: body.decision === 'accept' ? 'accepted' : 'rejected' }, token); return mapApplicationRow(row) as T; }
    if (/^team-requests\/[^/]+\/applications\/[^/]+$/.test(normalized) && init.method === 'DELETE') { const row = await rpc<any>('withdraw_team_application_mobile', { p_application_id: finalId(normalized) }, token); return mapApplicationRow(row) as T; }
    if (/^team-requests\/[^/]+\/invitations\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const row = await rpc<any>('respond_team_invitation', { target_application_id: finalId(normalized), decision: body.decision === 'accept' ? 'accepted' : 'rejected' }, token); return mapApplicationRow(row) as T; }
    if (/^connections\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const me = await getMe(token); const row = await rpc<any>(body.action === 'accept' || body.action === 'decline' ? 'respond_connection' : 'cancel_or_remove_connection', body.action === 'accept' || body.action === 'decline' ? { target_connection_id: resourceId(normalized), decision: body.action === 'accept' ? 'accepted' : 'declined' } : { target_connection_id: resourceId(normalized) }, token); const otherId = row.requester_id === me.userId ? row.addressee_id : row.requester_id; const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${otherId}` }), token); return mapConnectionRow(row, me.userId, profiles[0], me.campusId) as T; }
    if (normalized === 'connections' && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('request_connection', { target_user_id: body.targetUserId }, token); const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${body.targetUserId}` }), token); return mapConnectionRow(row, me.userId, profiles[0], me.campusId) as T; }
    if (/^chat\/rooms$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('create_direct_conversation', { other_user_id: body.memberIds?.[0] }, token); return mapConversationRow(row, token, me.userId) as Promise<T>; }
    if (/^chat\/team-requests\/[^/]+$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('ensure_team_conversation', { target_team_request_id: finalId(normalized) }, token); return mapConversationRow(row, token, me.userId) as Promise<T>; }
    if (/^chat\/rooms\/[^/]+\/messages$/.test(normalized) && init.method === 'POST') { const row = await rpc<any>('send_message', { target_conversation_id: resourceId(normalized), target_client_message_id: body.clientMessageId, target_message_type: body.messageType ?? 'text', target_text: body.content, target_link_url: body.linkUrl ?? null, target_reply_to_message_id: body.replyToMessageId ?? null, target_metadata: body.metadata ?? {} }, token); return mapMessageRow(row) as T; }
    if (/^chat\/messages\/[^/]+\/attachments$/.test(normalized) && init.method === 'POST') return rpc<any>('attach_message_file', { target_message_id: resourceId(normalized), target_storage_key: body.storageKey, target_file_name: body.fileName, target_mime_type: body.mimeType, target_byte_size: body.bytes, target_metadata: body.metadata ?? {} }, token).then((row) => ({ id: row.id, messageId: row.message_id, fileName: row.file_name, mimeType: row.mime_type, bytes: row.byte_size, storageKey: row.storage_key, scanStatus: row.scan_status }) as T);
    if (/^chat\/rooms\/[^/]+\/read$/.test(normalized) && init.method === 'PATCH') return rpc<T>('mark_conversation_read', { target_conversation_id: resourceId(normalized), through_message_id: body.messageId ?? null }, token);
    if (/^chat\/messages\/[^/]+$/.test(normalized) && init.method === 'PATCH') return rpc<any>('edit_message', { target_message_id: resourceId(normalized), replacement_text: body.content }, token).then((row) => mapMessageRow(row) as T);
    if (/^chat\/messages\/[^/]+$/.test(normalized) && init.method === 'DELETE') return rpc<any>('delete_message', { target_message_id: resourceId(normalized) }, token).then((row) => mapMessageRow(row) as T);
    if (/^chat\/messages\/[^/]+\/reactions$/.test(normalized) && init.method === 'POST') return rpc<T>('set_message_reaction', { target_message_id: resourceId(normalized), target_reaction: body.reaction, enabled: true }, token);
    if (/^chat\/rooms\/[^/]+\/mute$/.test(normalized) && (init.method === 'PUT' || init.method === 'DELETE')) return rpc<T>('set_chat_mute_mobile', { p_conversation_id: resourceId(normalized), p_muted: init.method === 'PUT' }, token);
    if (normalized === 'reports' || normalized === 'chat/reports') return rpc<T>('create_report_mobile', { p_target_type: normalized === 'chat/reports' ? 'message' : body.targetType, p_target_id: normalized === 'chat/reports' ? (body.messageIds?.[0] ?? body.roomId) : body.targetId, p_reason: body.reason ?? 'other', p_details: body.details ?? null }, token);
    if (normalized === 'blocks' && init.method === 'POST') return rpc<T>('set_block_mobile', { p_target_user_id: body.blockedUserId, p_blocked: true }, token);
    if (/^follows\/people\/[^/]+$/.test(normalized) && (init.method === 'POST' || init.method === 'DELETE')) return rpc<T>('set_follow_mobile', { p_target_user_id: finalId(normalized), p_following: init.method === 'POST' }, token);
    if (/^blocks\/[^/]+$/.test(normalized) && init.method === 'DELETE') return rpc<T>('set_block_mobile', { p_target_user_id: resourceId(normalized), p_blocked: false }, token);
    if (/^notifications\/[^/]+\/read$/.test(normalized) && init.method === 'PATCH') return rpc<T>('mark_notification_read_mobile', { p_notification_id: resourceId(normalized) }, token);
    if (normalized === 'notifications/preferences' && init.method === 'PATCH') { const me = await getMe(token); await rpc<any>('update_notification_preferences', { p_category: body.eventType, p_in_app: body.inApp ?? null, p_email: body.emailDigest ?? null, p_push: body.push ?? null, p_quiet_start: body.quietStart ?? null, p_quiet_end: body.quietEnd ?? null, p_timezone: body.timezone ?? null }, token); return { id: `${me.userId}:${body.eventType}`, campusId: me.campusId, userId: me.userId, eventType: body.eventType, inApp: body.inApp ?? true, push: body.push ?? false, emailDigest: body.emailDigest ?? true, updatedAt: new Date().toISOString() } as T; }
    if (normalized.startsWith('notifications/devices') && init.method === 'POST') return rpc<T>('register_device_mobile', { p_platform: body.platform, p_push_token: body.token, p_device_label: body.installationId }, token);
    if (normalized.startsWith('notifications/devices') && init.method === 'DELETE') return rpc<T>('disable_device_mobile', { p_device_label: finalId(normalized) }, token);
    if (normalized === 'account/requests' && init.method === 'POST') {
      let row: any;
      if (body.type === 'data_export') row = await rpc<any>('request_data_export', {}, token);
      else if (body.type === 'account_deletion') { await rpc('request_account_deletion', {}, token); row = (await select<any>('account_requests', postgrestQuery({ select: '*', request_type: 'eq.account_deletion', order: 'requested_at.desc', limit: 1 }), token))[0]; }
      else if (body.type === 'campus_change') row = await rpc<any>('request_campus_change', { p_target_campus_id: body.targetUniversityId, p_reason: body.reason ?? null }, token);
      else throw new ApiError('Unsupported account request type.', 400, 'INVALID_ACCOUNT_REQUEST');
      return { id: row.id, type: row.request_type, status: row.status, targetUniversityId: row.target_campus_id, reason: row.reason, requestedAt: row.requested_at, updatedAt: row.updated_at, completedAt: row.completed_at } as T;
    }
    if (/^account\/requests\/[^/]+$/.test(normalized) && init.method === 'DELETE') return rpc<T>('cancel_account_request', { p_request_id: resourceId(normalized) }, token);
    if (normalized === 'analytics/events' && init.method === 'POST') return rpc<T>('record_analytics_event', { p_event_name: body.eventName, p_properties: body.properties ?? {} }, token);
    throw new ApiError(`The CampusSphere backend does not expose /${normalized} yet.`, 501, 'ENDPOINT_NOT_IMPLEMENTED');
  }, init.retry401 !== false);
}

export const apiPost = <T>(path: string, body?: unknown, idempotencyKey?: string) => apiRequest<T>(path, { method: 'POST', body: { ...(body as any ?? {}), ...(idempotencyKey ? { clientMessageId: idempotencyKey } : {}) }, idempotencyKey });
export const apiPatch = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body });
export const apiPut = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body });
export const apiDelete = <T = void>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

function safeStorageFileName(name: string): string {
  const normalized = name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized.slice(-180) || 'attachment';
}

export async function uploadChatAttachment(input: {
  roomId: string;
  userId: string;
  name: string;
  mimeType: string;
  uri: string;
  blob?: Blob;
}): Promise<string> {
  return withAuth(async (token) => {
    const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const storageKey = `${input.roomId}/${input.userId}/${nonce}-${safeStorageFileName(input.name)}`;
    const content: Blob = input.blob ?? await fetch(input.uri).then(async (response) => {
      if (!response.ok) throw new ApiError('Could not read selected attachment.', response.status, 'ATTACHMENT_READ_FAILED');
      return await response.blob();
    });
    await uploadStorageObject(CHAT_ATTACHMENTS_BUCKET, storageKey, content, input.mimeType, token);
    return storageKey;
  });
}

export async function removeChatAttachment(storageKey: string): Promise<void> {
  return withAuth((token) => deleteStorageObject(CHAT_ATTACHMENTS_BUCKET, storageKey, token));
}

export async function getChatAttachmentUrl(storageKey: string): Promise<string> {
  return withAuth((token) => createStorageSignedUrl(CHAT_ATTACHMENTS_BUCKET, storageKey, token, 60));
}

export async function uploadPostMedia(input: {
  userId: string;
  name: string;
  mimeType: string;
  uri: string;
  blob?: Blob;
}): Promise<string> {
  return withAuth(async (token) => {
    const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const storageKey = `${input.userId}/${nonce}-${safeStorageFileName(input.name)}`;
    const content: Blob = input.blob ?? await fetch(input.uri).then(async (response) => {
      if (!response.ok) throw new ApiError('Could not read selected post media.', response.status, 'MEDIA_READ_FAILED');
      return await response.blob();
    });
    await uploadStorageObject(POST_MEDIA_BUCKET, storageKey, content, input.mimeType, token);
    return storageKey;
  });
}

export async function removePostMedia(storageKey: string): Promise<void> {
  return withAuth((token) => deleteStorageObject(POST_MEDIA_BUCKET, storageKey, token));
}
