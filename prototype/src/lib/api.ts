import { postgrestQuery, SupabaseHttpError, supabaseRequest } from './supabase-http';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'supabase://campussphere').replace(/\/+$/, '');

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

async function mutate<T>(table: string, method: 'POST' | 'PATCH' | 'DELETE', query: string, body: unknown, token: string): Promise<T> {
  const rows = await supabaseRequest<T[]>('rest', `${table}${query}`, {
    method,
    accessToken: token,
    body,
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
  });
  return (Array.isArray(rows) ? rows[0] : rows) as T;
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

function mapProfile(user: any, profile: any, skills: any[] = [], interests: any[] = [], links: any[] = [], viewerId?: string, viewerCampusId?: string) {
  return {
    userId: user?.id ?? profile?.user_id,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_key ?? null,
    department: profile?.department ?? null,
    studyYear: profile?.study_year ?? null,
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
  return {
    id: post.id,
    scope: post.visibility === 'global' ? 'global' : 'campus',
    authorMode: 'named',
    author: { userId: post.author_id, displayName: post.author?.display_name ?? 'Campus member', avatarUrl: post.author?.avatar_key ?? null },
    title: null,
    body: post.body,
    kind: 'discussion',
    visibility: post.visibility,
    reactions: { like: post.post_reactions?.length ?? 0, celebrate: 0, insightful: 0, support: 0 },
    commentCount,
    publishedAt: post.created_at,
    editedAt: post.edited_at,
    whyThis: [],
    version: 1,
    viewerReaction: post.post_reactions?.some((row: any) => row.user_id === viewerId) ? 'like' : null,
    viewerBookmarked: post.post_bookmarks?.some((row: any) => row.user_id === viewerId),
    mediaUrls: (post.post_media ?? []).sort((a: any, b: any) => a.display_order - b.display_order).map((row: any) => row.url).filter(Boolean),
    eventId: post.event_id,
    recruitment: Boolean(post.team_request_id),
  };
}

function mapTeamRow(row: any, viewerId: string, application?: any) {
  return {
    id: row.id, scope: 'campus', goalType: row.team_type, title: row.title, description: row.description,
    neededTags: row.team_request_skills?.map((item: any) => item.skills?.name).filter(Boolean) ?? [],
    timeWindowStart: row.application_deadline, timeWindowEnd: row.target_completion_date,
    capacity: row.desired_member_count, applicationPrompt: null,
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
    state: row.status === 'accepted' ? 'accepted' : row.status === 'rejected' ? 'declined' : 'pending',
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
    userRegistrationStatus: registrations[0]?.status ?? null, reminderEnabled: reminder[0]?.status === 'scheduled',
  };
}

export async function apiGet<T>(path: string, query: Record<string, string | number | undefined | null> = {}, retry401 = true): Promise<T> {
  return withAuth(async (token) => {
    const normalized = path.replace(/^\/+|\/+$/g, '');
    if (normalized === 'me') return getMe(token) as Promise<T>;
    if (normalized.startsWith('profiles/')) return getProfile(finalId(normalized) === 'me' ? (await getMe(token)).userId : finalId(normalized), token) as Promise<T>;
    if (normalized === 'events') {
      const me = await getMe(token);
      const rows = await select<any>('events', postgrestQuery({ select: '*,event_organizers(id,display_name)', campus_id: `eq.${me.campusId}`, status: `eq.${query.status ?? 'published'}`, order: 'starts_at.asc' }), token);
      return Promise.all(rows.map((event) => getEvent(event.id, token))) as Promise<T>;
    }
    if (/^events\/[^/]+$/.test(normalized)) return getEvent(resourceId(normalized), token) as Promise<T>;
    if (normalized === 'posts' || normalized === 'feed') {
      const me = await getMe(token);
      const rows = await select<any>('posts', postgrestQuery({ select: '*,post_reactions(reaction_type,user_id),post_bookmarks(user_id),post_media(url,display_order)', campus_id: `eq.${me.campusId}`, status: 'eq.published', order: 'created_at.desc', limit: query.limit ?? 30 }), token);
      const items = await Promise.all(rows.map(async (post) => {
        const [authors, comments] = await Promise.all([
          select<any>('profiles', postgrestQuery({ select: 'display_name,avatar_key', user_id: `eq.${post.author_id}` }), token),
          select<any>('comments', postgrestQuery({ select: 'id', post_id: `eq.${post.id}`, status: 'eq.published' }), token),
        ]);
        return mapPostRow({ ...post, author: authors[0] }, me.userId, comments.length);
      }));
      return { items, nextCursor: null } as T;
    }
    if (/^posts\/[^/]+$/.test(normalized)) {
      const me = await getMe(token);
      const rows = await select<any>('posts', postgrestQuery({ select: '*,post_reactions(reaction_type,user_id),post_bookmarks(user_id),post_media(url,display_order)', id: `eq.${resourceId(normalized)}` }), token);
      if (!rows[0]) return null as T;
      const [authors, comments] = await Promise.all([
        select<any>('profiles', postgrestQuery({ select: 'display_name,avatar_key', user_id: `eq.${rows[0].author_id}` }), token),
        select<any>('comments', postgrestQuery({ select: 'id', post_id: `eq.${rows[0].id}`, status: 'eq.published' }), token),
      ]);
      return mapPostRow({ ...rows[0], author: authors[0] }, me.userId, comments.length) as T;
    }
    if (/^posts\/[^/]+\/comments$/.test(normalized)) {
      const rows = await select<any>('comments', postgrestQuery({ select: '*', post_id: `eq.${resourceId(normalized)}`, status: 'eq.published', order: 'created_at.asc', limit: query.limit ?? 100 }), token);
      const items = await Promise.all(rows.map(async (row) => {
        const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name,avatar_key', user_id: `eq.${row.author_id}` }), token);
        return { id: row.id, postId: row.post_id, parentId: row.parent_comment_id, author: { userId: row.author_id, displayName: profiles[0]?.display_name ?? 'Campus member', avatarUrl: profiles[0]?.avatar_key ?? null }, body: row.body, createdAt: row.created_at };
      }));
      return { items, nextCursor: null } as T;
    }
    if (normalized === 'team-requests') { const me = await getMe(token); const rows = await select<any>('team_requests', postgrestQuery({ select: '*', campus_id: `eq.${me.campusId}`, status: `eq.${query.status ?? 'open'}`, deleted_at: 'is.null', order: 'created_at.desc', limit: query.limit ?? 100 }), token); const items = await Promise.all(rows.map(async (raw) => { const row = await attachTeamSkills(raw, token); const apps = await select<any>('team_applications', postgrestQuery({ select: '*', team_request_id: `eq.${row.id}`, applicant_id: `eq.${me.userId}` }), token); return mapTeamRow(row, me.userId, apps[0]); })); return { items, nextCursor: null } as T; }
    if (normalized === 'team-requests/invitations/mine') { const me = await getMe(token); const rows = await select<any>('team_applications', postgrestQuery({ select: '*', applicant_id: `eq.${me.userId}`, application_kind: 'eq.invitation', status: 'eq.pending', order: 'created_at.desc' }), token); const items = await Promise.all(rows.map(async (row) => { const teams = await select<any>('team_requests', postgrestQuery({ select: 'title', id: `eq.${row.team_request_id}` }), token); return mapApplicationRow({ ...row, applicant: { display_name: 'You' }, team: teams[0] }); })); return items as T; }
    if (/^team-requests\/[^/]+$/.test(normalized)) { const me = await getMe(token); const rows = await select<any>('team_requests', postgrestQuery({ select: '*', id: `eq.${resourceId(normalized)}` }), token); if (!rows[0]) return null as T; const row = await attachTeamSkills(rows[0], token); const apps = await select<any>('team_applications', postgrestQuery({ select: '*', team_request_id: `eq.${row.id}`, applicant_id: `eq.${me.userId}` }), token); return mapTeamRow(row, me.userId, apps[0]) as T; }
    if (/^team-requests\/[^/]+\/applications$/.test(normalized)) { const rows = await select<any>('team_applications', postgrestQuery({ select: '*', team_request_id: `eq.${resourceId(normalized)}`, order: 'created_at.asc' }), token); const items = await Promise.all(rows.map(async (row) => { const [profiles, teams] = await Promise.all([select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${row.applicant_id}` }), token), select<any>('team_requests', postgrestQuery({ select: 'title', id: `eq.${row.team_request_id}` }), token)]); return mapApplicationRow({ ...row, applicant: profiles[0], team: teams[0] }); })); return items as T; }
    if (normalized === 'connections') { const me = await getMe(token); const rows = await select<any>('connections', postgrestQuery({ select: '*', or: `(requester_id.eq.${me.userId},addressee_id.eq.${me.userId})`, order: 'updated_at.desc' }), token); const items = await Promise.all(rows.map(async (row) => { const otherId = row.requester_id === me.userId ? row.addressee_id : row.requester_id; const [profiles, users] = await Promise.all([select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${otherId}` }), token), select<any>('users', postgrestQuery({ select: 'campus_id', id: `eq.${otherId}` }), token)]); return mapConnectionRow(row, me.userId, { ...profiles[0], ...users[0] }, me.campusId); })); return items as T; }
    if (normalized === 'chat/rooms') { const me = await getMe(token); const rows = await select<any>('conversations', postgrestQuery({ select: '*', order: 'updated_at.desc' }), token); return Promise.all(rows.map((row) => mapConversationRow(row, token, me.userId))) as Promise<T>; }
    if (/^chat\/rooms\/[^/]+$/.test(normalized)) { const me = await getMe(token); const rows = await select<any>('conversations', postgrestQuery({ select: '*', id: `eq.${resourceId(normalized)}` }), token); return rows[0] ? mapConversationRow(rows[0], token, me.userId) as Promise<T> : null as T; }
    if (/^chat\/rooms\/[^/]+\/messages$/.test(normalized)) { const rows = await select<any>('messages', postgrestQuery({ select: '*', conversation_id: `eq.${resourceId(normalized)}`, status: 'eq.visible', order: 'created_at.desc', limit: query.limit ?? 100 }), token); return { items: rows.map((row) => ({ id: row.id, roomId: row.conversation_id, senderId: row.sender_id, clientMessageId: row.client_message_id, content: row.text, messageType: row.message_type, linkUrl: row.link_url, replyToMessageId: row.reply_to_message_id, metadata: row.metadata, status: row.status, createdAt: row.created_at, editedAt: row.edited_at, deletedAt: row.deleted_at })), nextCursor: null } as T; }
    if (normalized === 'notifications') { const rows = await select<any>('notifications', postgrestQuery({ select: '*', in_app_read_at: query.unreadOnly === 'true' ? 'is.null' : undefined, order: 'created_at.desc', limit: 100 }), token); return rows.map((row) => ({ id: row.id, recipientId: row.user_id, eventType: row.type, title: row.payload?.title ?? row.type, body: row.payload?.body ?? '', read: Boolean(row.in_app_read_at), referenceType: row.subject_type, referenceId: row.subject_id, createdAt: row.created_at })) as T; }
    if (normalized === 'notifications/preferences') { const me = await getMe(token); const rows = await select<any>('notification_preferences', postgrestQuery({ select: '*', user_id: `eq.${me.userId}` }), token); const row = rows[0] ?? { user_id: me.userId, in_app_enabled: true, push_enabled: false, email_enabled: true, category_settings: {}, updated_at: new Date(0).toISOString() }; const eventTypes = ['post_reaction', 'comment', 'event_reminder', 'club_update', 'chat_message', 'security_alert']; return eventTypes.map((eventType) => { const category = row.category_settings?.[eventType] ?? {}; return { id: `${row.user_id}:${eventType}`, campusId: me.campusId, userId: row.user_id, eventType, inApp: category.inApp ?? row.in_app_enabled, push: category.push ?? row.push_enabled, emailDigest: category.emailDigest ?? row.email_enabled, updatedAt: row.updated_at }; }) as T; }
    if (normalized === 'blocks') { return select<any>('user_blocks', postgrestQuery({ select: 'blocked_id,created_at', order: 'created_at.desc' }), token).then((rows) => rows.map((row) => ({ blockedUserId: row.blocked_id, createdAt: row.created_at }))) as Promise<T>; }
    if (normalized === 'follows') { const me = await getMe(token); const rows = await select<any>('following', postgrestQuery({ select: 'followee_id,created_at', follower_id: `eq.${me.userId}`, order: 'created_at.desc' }), token); const items = await Promise.all(rows.map(async (row) => { const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${row.followee_id}` }), token); return { targetType: 'person', targetId: row.followee_id, displayName: profiles[0]?.display_name ?? 'Campus member', followedAt: row.created_at }; })); return items as T; }
    if (normalized === 'recommendations') { const me = await getMe(token); const rows = await select<any>('profiles', postgrestQuery({ select: 'user_id,display_name,department', discoverable: 'eq.true', user_id: `neq.${me.userId}`, limit: query.limit ?? 30 }), token); const items = await Promise.all(rows.map(async (row) => { const skills = await select<any>('profile_skills', postgrestQuery({ select: 'skills(name)', user_id: `eq.${row.user_id}` }), token); return { userId: row.user_id, displayName: row.display_name, department: row.department, matchedTags: skills.map((item) => item.skills?.name).filter(Boolean), explanations: ['skill_overlap'] }; })); return items as T; }
    if (normalized === 'search') { const q = String(query.q ?? '').trim(); if (q.length < 2) return { hits: [], degraded: false } as T; const type = String(query.type ?? 'all'); const hits: any[] = []; if (type === 'all' || type === 'person') { const profiles = await select<any>('profiles', postgrestQuery({ select: 'user_id,display_name', display_name: `ilike.*${q}*`, discoverable: 'eq.true', limit: query.limit ?? 40 }), token); hits.push(...profiles.map((row) => ({ id: row.user_id, docType: 'person', title: row.display_name, scope: 'campus', score: 1, excerpt: '' }))); } if (type === 'all' || type === 'event') { const events = await select<any>('events', postgrestQuery({ select: 'id,title,summary', title: `ilike.*${q}*`, status: 'eq.published', limit: query.limit ?? 40 }), token); hits.push(...events.map((row) => ({ id: row.id, docType: 'event', title: row.title, scope: 'campus', score: .9, excerpt: row.summary }))); } if (type === 'all' || type === 'post') { const posts = await select<any>('posts', postgrestQuery({ select: 'id,body,visibility', body: `ilike.*${q}*`, status: 'eq.published', limit: query.limit ?? 40 }), token); hits.push(...posts.map((row) => ({ id: row.id, docType: 'post', title: row.body.slice(0, 55), scope: row.visibility === 'global' ? 'global' : 'campus', score: .8, excerpt: row.body }))); } if (type === 'all' || type === 'team') { const teams = await select<any>('team_requests', postgrestQuery({ select: 'id,title,description', title: `ilike.*${q}*`, status: 'eq.open', limit: query.limit ?? 40 }), token); hits.push(...teams.map((row) => ({ id: row.id, docType: 'team', title: row.title, scope: 'campus', score: .85, excerpt: row.description }))); } return { hits, degraded: false } as T; }
    if (normalized === 'bookmarks') { const me = await getMe(token); const [posts, events] = await Promise.all([select<any>('post_bookmarks', postgrestQuery({ select: 'post_id', user_id: `eq.${me.userId}` }), token), select<any>('event_bookmarks', postgrestQuery({ select: 'event_id', user_id: `eq.${me.userId}` }), token)]); return [...posts.map((r) => ({ target_type: 'post', target_id: r.post_id })), ...events.map((r) => ({ target_type: 'event', target_id: r.event_id }))] as T; }
    if (normalized === 'universities') { const rows = await select<any>('campuses', postgrestQuery({ select: 'id,name,slug,country_code,timezone', name: query.q ? `ilike.*${String(query.q)}*` : undefined, status: 'eq.active', limit: query.limit ?? 25 }), token); return { items: rows.map((r) => ({ id: r.id, name: r.name, country: r.country_code, countryCode: r.country_code, domain: null, stateProvince: null })), total: rows.length, limit: Number(query.limit ?? 25), offset: 0 } as T; }
    throw new ApiError(`The CampusSphere backend does not expose /${normalized} yet.`, 501, 'ENDPOINT_NOT_IMPLEMENTED');
  }, retry401);
}

export async function apiRequest<T>(path: string, init: { method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; idempotencyKey?: string; retry401?: boolean; headers?: Record<string, string> }): Promise<T> {
  const normalized = path.replace(/^\/+|\/+$/g, '');
  return withAuth(async (token) => {
    const body: any = init.body ?? {};
    if (normalized === 'profiles/me' && init.method === 'PATCH') return rpc<T>('update_my_profile', {
      p_display_name: body.displayName, p_department: body.department, p_study_year: body.studyYear,
      p_bio: body.bio ?? '', p_discoverable: Boolean(body.discoverable), p_skills: body.skills ?? [],
      p_interests: body.interests ?? [], p_link_label: body.links?.[0]?.label ?? null, p_link_url: body.links?.[0]?.url ?? null,
    }, token);
    if (normalized === 'posts' && init.method === 'POST') { const me = await getMe(token); const row = await mutate<any>('posts', 'POST', '', { author_id: me.userId, campus_id: me.campusId, body: body.body, visibility: body.visibility ?? body.scope ?? 'campus', status: 'published', event_id: body.eventId ?? null }, token); return mapPostRow({ ...row, author: { display_name: 'You', avatar_key: null } }, me.userId) as T; }
    if (/^posts\/[^/]+\/comments$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await mutate<any>('comments', 'POST', '', { post_id: resourceId(normalized), author_id: me.userId, body: body.body, status: 'published' }, token); return { ...row, postId: row.post_id, parentId: row.parent_comment_id, author: { userId: me.userId, displayName: 'You', avatarUrl: null }, createdAt: row.created_at } as T; }
    if (/^posts\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const row = await mutate<any>('posts', 'PATCH', postgrestQuery({ id: `eq.${resourceId(normalized)}` }), body, token); const me = await getMe(token); return mapPostRow({ ...row, author: { display_name: 'You', avatar_key: null } }, me.userId) as T; }
    if (/^posts\/[^/]+$/.test(normalized) && init.method === 'DELETE') return mutate<T>('posts', 'DELETE', postgrestQuery({ id: `eq.${resourceId(normalized)}` }), undefined, token);
    if (/^posts\/[^/]+\/reactions$/.test(normalized)) { const me = await getMe(token); const postId = resourceId(normalized); const existing = await select<any>('post_reactions', postgrestQuery({ select: 'post_id', post_id: `eq.${postId}`, user_id: `eq.${me.userId}` }), token); if (existing.length) { await mutate('post_reactions', 'DELETE', postgrestQuery({ post_id: `eq.${postId}`, user_id: `eq.${me.userId}` }), undefined, token); return { added: false } as T; } await mutate('post_reactions', 'POST', '', { post_id: postId, user_id: me.userId, reaction_type: 'like' }, token); return { added: true } as T; }
    if (normalized === 'bookmarks' && init.method === 'POST') { const me = await getMe(token); const table = body.targetType === 'event' ? 'event_bookmarks' : 'post_bookmarks'; const key = body.targetType === 'event' ? 'event_id' : 'post_id'; const existing = await select<any>(table, postgrestQuery({ select: key, [key]: `eq.${body.targetId}`, user_id: `eq.${me.userId}` }), token); if (existing.length) { await mutate('' + table, 'DELETE', postgrestQuery({ [key]: `eq.${body.targetId}`, user_id: `eq.${me.userId}` }), undefined, token); return { bookmarked: false } as T; } await mutate(table, 'POST', '', { [key]: body.targetId, user_id: me.userId }, token); return { bookmarked: true } as T; }
    if (/^events\/[^/]+\/registrations$/.test(normalized)) return rpc<T>(init.method === 'POST' ? 'register_for_event' : 'cancel_event_registration', { target_event_id: resourceId(normalized) }, token);
    if (/^events\/[^/]+\/reminders$/.test(normalized)) { const me = await getMe(token); const eventId = resourceId(normalized); if (init.method === 'DELETE') return mutate<T>('event_reminders', 'DELETE', postgrestQuery({ event_id: `eq.${eventId}`, user_id: `eq.${me.userId}` }), undefined, token); const event = await getEvent(eventId, token); return mutate<T>('event_reminders', 'POST', '', { event_id: eventId, user_id: me.userId, minutes_before: 1440, scheduled_for: new Date(new Date(event.startTime).getTime() - 86400000).toISOString(), channels: ['in_app'], status: 'scheduled' }, token); }
    if (normalized === 'team-requests' && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('create_team_request_mobile', { p_title: body.title, p_description: body.description, p_team_type: body.goalType ?? 'project', p_desired_member_count: body.capacity ?? 4, p_skills: body.neededTags ?? [] }, token); return mapTeamRow(await attachTeamSkills(row, token), me.userId) as T; }
    if (/^team-requests\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const me = await getMe(token); const row = await rpc<any>('update_team_request_mobile', { target_team_request_id: resourceId(normalized), p_title: body.title ?? null, p_description: body.description ?? null, p_status: body.status ?? null, p_skills: body.neededTags ?? null }, token); return mapTeamRow(await attachTeamSkills(row, token), me.userId) as T; }
    if (/^team-requests\/[^/]+\/applications$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await mutate<any>('team_applications', 'POST', '', { team_request_id: resourceId(normalized), applicant_id: me.userId, message: body.responseText ?? '', status: 'pending' }, token); return mapApplicationRow({ ...row, applicant: { display_name: 'You' } }) as T; }
    if (/^team-requests\/[^/]+\/invitations$/.test(normalized) && init.method === 'POST') { const row = await rpc<any>('invite_to_team', { target_team_request_id: resourceId(normalized), target_user_id: body.targetUserId }, token); const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${row.applicant_id}` }), token); return mapApplicationRow({ ...row, applicant: profiles[0] }) as T; }
    if (/^team-requests\/[^/]+\/applications\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const row = await rpc<any>('decide_team_application', { target_application_id: finalId(normalized), decision: body.decision === 'accept' ? 'accepted' : 'rejected' }, token); return mapApplicationRow(row) as T; }
    if (/^team-requests\/[^/]+\/invitations\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const row = await rpc<any>('respond_team_invitation', { target_application_id: finalId(normalized), decision: body.decision === 'accept' ? 'accepted' : 'rejected' }, token); return mapApplicationRow(row) as T; }
    if (/^connections\/[^/]+$/.test(normalized) && init.method === 'PATCH') { const me = await getMe(token); const row = await rpc<any>(body.action === 'accept' || body.action === 'decline' ? 'respond_connection' : 'cancel_or_remove_connection', body.action === 'accept' || body.action === 'decline' ? { target_connection_id: resourceId(normalized), decision: body.action === 'accept' ? 'accepted' : 'declined' } : { target_connection_id: resourceId(normalized) }, token); const otherId = row.requester_id === me.userId ? row.addressee_id : row.requester_id; const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${otherId}` }), token); return mapConnectionRow(row, me.userId, profiles[0], me.campusId) as T; }
    if (normalized === 'connections' && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('request_connection', { target_user_id: body.targetUserId }, token); const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${body.targetUserId}` }), token); return mapConnectionRow(row, me.userId, profiles[0], me.campusId) as T; }
    if (/^chat\/rooms$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('create_direct_conversation', { other_user_id: body.memberIds?.[0] }, token); return mapConversationRow(row, token, me.userId) as Promise<T>; }
    if (/^chat\/team-requests\/[^/]+$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const row = await rpc<any>('ensure_team_conversation', { target_team_request_id: finalId(normalized) }, token); return mapConversationRow(row, token, me.userId) as Promise<T>; }
    if (/^chat\/rooms\/[^/]+\/messages$/.test(normalized) && init.method === 'POST') { const row = await rpc<any>('send_message', { target_conversation_id: resourceId(normalized), target_client_message_id: body.clientMessageId, target_message_type: body.messageType ?? 'text', target_text: body.content, target_link_url: body.linkUrl ?? null, target_reply_to_message_id: body.replyToMessageId ?? null, target_metadata: body.metadata ?? {} }, token); return mapMessageRow(row) as T; }
    if (/^chat\/rooms\/[^/]+\/read$/.test(normalized) && init.method === 'PATCH') return rpc<T>('mark_conversation_read', { target_conversation_id: resourceId(normalized), through_message_id: body.messageId ?? null }, token);
    if (/^chat\/messages\/[^/]+$/.test(normalized) && init.method === 'PATCH') return rpc<any>('edit_message', { target_message_id: resourceId(normalized), replacement_text: body.content }, token).then((row) => mapMessageRow(row) as T);
    if (/^chat\/messages\/[^/]+$/.test(normalized) && init.method === 'DELETE') return rpc<any>('delete_message', { target_message_id: resourceId(normalized) }, token).then((row) => mapMessageRow(row) as T);
    if (/^chat\/messages\/[^/]+\/reactions$/.test(normalized) && init.method === 'POST') return rpc<T>('set_message_reaction', { target_message_id: resourceId(normalized), target_reaction: body.reaction, enabled: true }, token);
    if (/^chat\/rooms\/[^/]+\/mute$/.test(normalized) && (init.method === 'PUT' || init.method === 'DELETE')) {
      const me = await getMe(token);
      return mutate<T>('conversation_members', 'PATCH', postgrestQuery({ conversation_id: `eq.${resourceId(normalized)}`, user_id: `eq.${me.userId}` }), { notification_mode: init.method === 'DELETE' ? 'all' : 'muted' }, token);
    }
    if (normalized === 'reports' || normalized === 'chat/reports') { const me = await getMe(token); return mutate<T>('reports', 'POST', '', { reporter_id: me.userId, target_type: normalized === 'chat/reports' ? 'message' : body.targetType, target_id: normalized === 'chat/reports' ? (body.messageIds?.[0] ?? body.roomId) : body.targetId, reason_code: body.reason ?? 'other', details: body.details ?? null }, token); }
    if (normalized === 'blocks' && init.method === 'POST') { const me = await getMe(token); return mutate<T>('user_blocks', 'POST', '', { blocker_id: me.userId, blocked_id: body.blockedUserId }, token); }
    if (/^follows\/people\/[^/]+$/.test(normalized) && init.method === 'POST') { const me = await getMe(token); const targetId = finalId(normalized); const row = await mutate<any>('following', 'POST', '', { follower_id: me.userId, followee_id: targetId }, token); const profiles = await select<any>('profiles', postgrestQuery({ select: 'display_name', user_id: `eq.${targetId}` }), token); return { targetType: 'person', targetId, displayName: profiles[0]?.display_name ?? 'Campus member', followedAt: row.created_at } as T; }
    if (/^follows\/people\/[^/]+$/.test(normalized) && init.method === 'DELETE') { const me = await getMe(token); return mutate<T>('following', 'DELETE', postgrestQuery({ follower_id: `eq.${me.userId}`, followee_id: `eq.${finalId(normalized)}` }), undefined, token); }
    if (/^blocks\/[^/]+$/.test(normalized) && init.method === 'DELETE') { const me = await getMe(token); return mutate<T>('user_blocks', 'DELETE', postgrestQuery({ blocker_id: `eq.${me.userId}`, blocked_id: `eq.${resourceId(normalized)}` }), undefined, token); }
    if (/^notifications\/[^/]+\/read$/.test(normalized) && init.method === 'PATCH') return mutate<T>('notifications', 'PATCH', postgrestQuery({ id: `eq.${resourceId(normalized)}` }), { in_app_read_at: new Date().toISOString() }, token);
    if (normalized === 'notifications/preferences' && init.method === 'PATCH') { const me = await getMe(token); const existing = (await select<any>('notification_preferences', postgrestQuery({ select: '*', user_id: `eq.${me.userId}` }), token))[0]; const categorySettings = { ...(existing?.category_settings ?? {}), [body.eventType]: body }; await mutate<any>('notification_preferences', 'POST', '', { user_id: me.userId, in_app_enabled: existing?.in_app_enabled ?? true, email_enabled: existing?.email_enabled ?? true, push_enabled: existing?.push_enabled ?? false, category_settings: categorySettings }, token); return { id: `${me.userId}:${body.eventType}`, campusId: me.campusId, userId: me.userId, eventType: body.eventType, inApp: body.inApp ?? true, push: body.push ?? false, emailDigest: body.emailDigest ?? true, updatedAt: new Date().toISOString() } as T; }
    if (normalized.startsWith('notifications/devices') && (init.method === 'POST' || init.method === 'DELETE')) { const me = await getMe(token); const installationId = finalId(normalized); return init.method === 'DELETE' ? mutate<T>('user_devices', 'PATCH', postgrestQuery({ device_label: `eq.${installationId}`, user_id: `eq.${me.userId}` }), { disabled_at: new Date().toISOString() }, token) : mutate<T>('user_devices', 'POST', '', { user_id: me.userId, platform: body.platform, push_token: body.token, device_label: body.installationId }, token); }
    throw new ApiError(`The CampusSphere backend does not expose /${normalized} yet.`, 501, 'ENDPOINT_NOT_IMPLEMENTED');
  }, init.retry401 !== false);
}

export const apiPost = <T>(path: string, body?: unknown, idempotencyKey?: string) => apiRequest<T>(path, { method: 'POST', body: { ...(body as any ?? {}), ...(idempotencyKey ? { clientMessageId: idempotencyKey } : {}) }, idempotencyKey });
export const apiPatch = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body });
export const apiPut = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body });
export const apiDelete = <T = void>(path: string) => apiRequest<T>(path, { method: 'DELETE' });
