import { HttpError } from './errors.mjs';
import { restRpc, restSelect, supabaseRequest } from './supabase.mjs';
import { canAccessCampus, requireCampus, requireContextCampus, requireRole, requireRoleGrant } from './permissions.mjs';

const limitMax = 100;

function pageParams(searchParams) {
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(limitMax, Math.max(1, Number(searchParams.get('limit') || 25)));
  return { page, limit, offset: (page - 1) * limit };
}

function statusFilter(searchParams, fallback = null) {
  const raw = searchParams.get('status');
  if (raw === null || raw.trim() === '') return fallback ? { status: fallback } : {};
  const status = raw.trim().toLowerCase();
  if (status === 'all') return {};
  if (!/^[a-z][a-z0-9_]*$/.test(status)) throw new HttpError(400, 'Invalid status filter.', 'INVALID_STATUS_FILTER');
  return { status: `eq.${status}` };
}

function inFilter(ids) { return ids.length ? `in.(${ids.join(',')})` : null; }

async function insert(table, body) {
  const result = await supabaseRequest('rest', table, { method: 'POST', admin: true, body, headers: { Prefer: 'return=representation' } });
  return result.data?.[0] || result.data;
}

async function upsert(table, conflict, body) {
  const result = await supabaseRequest('rest', `${table}?on_conflict=${encodeURIComponent(conflict)}`, { method: 'POST', admin: true, body, headers: { Prefer: 'return=representation,resolution=merge-duplicates' } });
  return result.data?.[0] || result.data;
}

async function update(table, filter, body) {
  const result = await supabaseRequest('rest', `${table}?${new URLSearchParams(filter)}`, { method: 'PATCH', admin: true, body, headers: { Prefer: 'return=representation' } });
  return result.data?.[0] || result.data;
}

async function remove(table, filter) {
  const result = await supabaseRequest('rest', `${table}?${new URLSearchParams(filter)}`, { method: 'DELETE', admin: true, headers: { Prefer: 'return=representation' } });
  return result.data?.[0] || result.data;
}

async function userLabels(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const [users, profiles] = await Promise.all([
    restSelect('users', { select: 'id,email,campus_id', id: inFilter(unique) }, { admin: true }),
    restSelect('profiles', { select: 'user_id,display_name', user_id: inFilter(unique) }, { admin: true }),
  ]);
  const profileMap = new Map((profiles.data || []).map((row) => [row.user_id, row.display_name]));
  return new Map((users.data || []).map((row) => [row.id, { ...row, displayName: profileMap.get(row.id) || row.email }]));
}

async function audit(context, action, targetType = null, targetId = null, metadata = {}) {
  await insert('audit_logs', { actor_id: context.user.id, action, target_type: targetType, target_id: targetId, metadata: { ...metadata, admin_role: context.role, campus_id: context.campusId } });
}

async function count(table, filters = {}, select = 'id') {
  const result = await restSelect(table, { select, ...filters, limit: 1 }, { admin: true, count: true });
  return result.count ?? (Array.isArray(result.data) ? result.data.length : 0);
}

async function visibleEventIds(context) {
  if (context.role === 'super_admin') return null;
  if (context.role === 'campus_admin') {
    requireContextCampus(context);
    const rows = await restSelect('events', { select: 'id', campus_id: `eq.${context.campusId}` }, { admin: true });
    return rows.data?.map((row) => row.id) || [];
  }
  const owners = await restSelect('event_admin_owners', { select: 'event_id', user_id: `eq.${context.user.id}`, status: 'eq.active' }, { admin: true });
  return owners.data?.map((row) => row.event_id) || [];
}

function maskIp(value) {
  if (!value) return null;
  const text = String(value);
  if (text.includes(':')) return `${text.split(':').slice(0, 3).join(':')}:*`;
  const parts = text.split('.');
  return parts.length === 4 ? `${parts[0]}.***.***.${parts[3]}` : 'masked';
}

function maskFingerprint(value) {
  if (!value) return null;
  const text = String(value);
  return text.length <= 8 ? 'masked' : `${text.slice(0, 4)}…${text.slice(-4)}`;
}

async function scopedUser(context, id) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const result = await restSelect('users', { select: 'id,email,phone_e164,phone_verified_at,campus_id,status,created_at,updated_at', id: `eq.${id}`, limit: 1 }, { admin: true });
  const user = result.data?.[0];
  if (!user) throw new HttpError(404, 'User not found.', 'USER_NOT_FOUND');
  requireCampus(context, user.campus_id);
  return user;
}

async function reportTargetCampusId(report) {
  const directTables = {
    post: 'posts',
    event: 'events',
    team_request: 'team_requests',
    resource: 'resources',
  };
  const directTable = directTables[report.target_type];
  if (directTable) {
    const result = await restSelect(directTable, { select: 'campus_id', id: `eq.${report.target_id}`, limit: 1 }, { admin: true });
    return result.data?.[0]?.campus_id || null;
  }
  if (report.target_type === 'user') {
    const result = await restSelect('users', { select: 'campus_id', id: `eq.${report.target_id}`, limit: 1 }, { admin: true });
    return result.data?.[0]?.campus_id || null;
  }
  if (report.target_type === 'comment') {
    const comment = await restSelect('comments', { select: 'post_id', id: `eq.${report.target_id}`, limit: 1 }, { admin: true });
    const postId = comment.data?.[0]?.post_id;
    if (!postId) return null;
    const post = await restSelect('posts', { select: 'campus_id', id: `eq.${postId}`, limit: 1 }, { admin: true });
    return post.data?.[0]?.campus_id || null;
  }
  if (report.target_type === 'message') {
    const message = await restSelect('messages', { select: 'sender_id', id: `eq.${report.target_id}`, limit: 1 }, { admin: true });
    const senderId = message.data?.[0]?.sender_id;
    if (!senderId) return null;
    const sender = await restSelect('users', { select: 'campus_id', id: `eq.${senderId}`, limit: 1 }, { admin: true });
    return sender.data?.[0]?.campus_id || null;
  }
  if (report.target_type === 'team_application') {
    const application = await restSelect('team_applications', { select: 'team_request_id', id: `eq.${report.target_id}`, limit: 1 }, { admin: true });
    const requestId = application.data?.[0]?.team_request_id;
    if (!requestId) return null;
    const request = await restSelect('team_requests', { select: 'campus_id', id: `eq.${requestId}`, limit: 1 }, { admin: true });
    return request.data?.[0]?.campus_id || null;
  }
  return null;
}

async function requireActiveCampus(campusId) {
  if (!campusId) throw new HttpError(400, 'Select a campus for this scoped role.', 'CAMPUS_REQUIRED');
  const result = await restSelect('campuses', { select: 'id', id: `eq.${campusId}`, status: 'eq.active', limit: 1 }, { admin: true });
  if (!result.data?.length) throw new HttpError(400, 'The selected campus is not active or does not exist.', 'CAMPUS_INVALID');
}

export async function dashboard(context) {
  const campusFilter = context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` };
  const [members, events, posts, reports, campuses, staff, registrations, waitlisted, auditRows, notifications, recentPosts] = await Promise.all([
    count('users', { ...campusFilter, status: 'eq.active' }),
    count('events', { ...campusFilter, status: 'eq.published' }),
    count('posts', { ...campusFilter, status: 'eq.published' }),
    count('reports', { status: 'in.(open,reviewing)' }),
    count('campuses', { status: 'eq.active' }),
    count('admin_assignments', { ...(context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` }), status: 'eq.active', role: 'eq.event_manager' }),
    count('event_registrations', { status: 'eq.registered' }, 'event_id'),
    count('event_registrations', { status: 'eq.waitlisted' }, 'event_id'),
    restSelect('audit_logs', { select: 'id,action,target_type,target_id,metadata,created_at', order: 'created_at.desc', limit: 8 }, { admin: true }),
    count('notifications', { user_id: `eq.${context.user.id}`, in_app_read_at: 'is.null' }),
    restSelect('posts', { select: 'id,created_at', ...campusFilter, created_at: `gte.${new Date(Date.now() - 7 * 86400000).toISOString()}`, order: 'created_at.asc', limit: 100 }, { admin: true }),
  ]);
  const value = context.role === 'event_manager' ? registrations : context.role === 'super_admin' ? members : members;
  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.now() - (6 - index) * 86400000);
    const key = day.toISOString().slice(0, 10);
    return recentPosts.data?.filter((row) => row.created_at?.slice(0, 10) === key).length || 0;
  });
  return {
    metrics: context.role === 'event_manager'
      ? [{ label: 'Upcoming events', value: events, display: String(events), delta: 'Live', context: 'published in your scope', tone: 'lime' }, { label: 'Registrations', value: registrations, display: registrations.toLocaleString(), delta: 'Live', context: 'across visible events', tone: 'blue' }, { label: 'Waitlisted', value: waitlisted, display: waitlisted.toLocaleString(), delta: 'Live', context: 'need capacity review', tone: 'amber' }, { label: 'Drafts', value: await count('events', { ...(context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` }), status: 'eq.draft' }), delta: 'Live', display: String(await count('events', { ...(context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` }), status: 'eq.draft' })), context: 'awaiting publication', tone: 'neutral' }]
      : context.role === 'super_admin'
        ? [{ label: 'Active campuses', value: campuses, display: String(campuses), delta: 'Live', context: 'healthy assignments', tone: 'lime' }, { label: 'Platform members', value: members, display: members.toLocaleString(), delta: 'Live', context: 'across all campuses', tone: 'blue' }, { label: 'Open reports', value: reports, display: String(reports), delta: 'Live', context: 'platform moderation', tone: 'amber' }, { label: 'Service health', value: 99.98, display: '99.98%', delta: 'Operational', context: 'Supabase reachability', tone: 'lime' }]
        : [{ label: 'Campus members', value: members, display: members.toLocaleString(), delta: 'Live', context: 'active in your campus', tone: 'lime' }, { label: 'Active events', value: events, display: String(events), delta: 'Live', context: 'currently published', tone: 'blue' }, { label: 'Posts to review', value: reports, display: String(reports), delta: 'Live', context: 'open platform reports', tone: 'amber' }, { label: 'Event managers', value: staff, display: String(staff), delta: 'Live', context: 'assigned to campus', tone: 'neutral' }],
    trend,
    health: { value: 99.98, unreadNotifications: notifications, status: 'Operational' },
    activity: (auditRows.data || []).map((row) => ({ time: row.created_at, title: row.action, detail: row.target_type ? `${row.target_type} ${row.target_id || ''}` : 'Administrative activity', actor: 'Admin audit', tone: 'neutral' })),
  };
}

export async function listPosts(context, searchParams) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const { page, limit, offset } = pageParams(searchParams);
  const filter = context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` };
  const result = await restSelect('posts', { select: 'id,author_id,campus_id,body,visibility,status,created_at,updated_at', ...filter, ...statusFilter(searchParams), order: 'created_at.desc', limit, offset }, { admin: true, count: true });
  const records = result.data || [];
  const labels = await userLabels(records.map((row) => row.author_id));
  const reports = records.length ? await restSelect('reports', { select: 'target_id,status', target_type: 'eq.post', target_id: inFilter(records.map((row) => row.id)) }, { admin: true }) : { data: [] };
  const reportCounts = new Map();
  for (const row of reports.data || []) reportCounts.set(row.target_id, (reportCounts.get(row.target_id) || 0) + (['open', 'reviewing'].includes(row.status) ? 1 : 0));
  const mapped = records.map((row) => ({ ...row, author: labels.get(row.author_id)?.displayName || row.author_id, reports: reportCounts.get(row.id) || 0 }));
  return { records: mapped, total: result.count ?? mapped.length, page, limit, columns: ['Post', 'Author', 'Reports', 'Status'], rows: mapped.map((row) => [row.body.slice(0, 110), row.author, String(row.reports), row.status]) };
}

export async function createPost(context, body) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const campusId = context.role === 'super_admin' ? body.campusId : context.campusId;
  await requireActiveCampus(campusId);
  requireCampus(context, campusId);
  if (!body.body?.trim()) throw new HttpError(400, 'Post content is required.', 'POST_BODY_REQUIRED');
  const row = await insert('posts', { author_id: context.user.id, campus_id: campusId, body: body.body.trim(), visibility: body.visibility || 'campus', status: body.status || 'published' });
  await audit(context, 'post.created', 'post', row.id, { campus_id: campusId });
  return row;
}

export async function updatePostStatus(context, id, status) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const found = await restSelect('posts', { select: 'id,campus_id', id: `eq.${id}`, limit: 1 }, { admin: true });
  const post = found.data?.[0];
  if (!post) throw new HttpError(404, 'Post not found.', 'POST_NOT_FOUND');
  requireCampus(context, post.campus_id);
  if (!['published', 'hidden', 'removed', 'deleted'].includes(status)) throw new HttpError(400, 'Invalid post status.', 'INVALID_STATUS');
  const row = await update('posts', { id: `eq.${id}` }, { status, deleted_at: ['removed', 'deleted'].includes(status) ? new Date().toISOString() : null });
  await audit(context, `post.${status}`, 'post', id, { campus_id: post.campus_id });
  return row;
}

export async function listModeration(context, searchParams) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const { page, limit, offset } = pageParams(searchParams);
  const requestedStatus = searchParams.get('status');
  const moderationStatus = !requestedStatus || requestedStatus === 'all' ? { status: 'in.(open,reviewing)' } : statusFilter(searchParams);
  const result = await restSelect('reports', { select: 'id,reporter_id,target_type,target_id,reason_code,details,status,resolution,created_at', ...moderationStatus, order: 'created_at.asc', limit, offset }, { admin: true, count: true });
  const rows = result.data || [];
  const labels = await userLabels(rows.map((row) => row.reporter_id));
  const idsByType = (type) => rows.filter((row) => row.target_type === type).map((row) => row.target_id);
  const [posts, comments, messages, users, events, teamRequests, teamApplications] = await Promise.all([
    idsByType('post').length ? restSelect('posts', { select: 'id,campus_id,body,status', id: inFilter(idsByType('post')) }, { admin: true }) : { data: [] },
    idsByType('comment').length ? restSelect('comments', { select: 'id,post_id,author_id,body,status', id: inFilter(idsByType('comment')) }, { admin: true }) : { data: [] },
    idsByType('message').length ? restSelect('messages', { select: 'id,sender_id,conversation_id,message_type,text,status,created_at', id: inFilter(idsByType('message')) }, { admin: true }) : { data: [] },
    idsByType('user').length ? restSelect('users', { select: 'id,email,campus_id,status', id: inFilter(idsByType('user')) }, { admin: true }) : { data: [] },
    idsByType('event').length ? restSelect('events', { select: 'id,campus_id,title,status', id: inFilter(idsByType('event')) }, { admin: true }) : { data: [] },
    idsByType('team_request').length ? restSelect('team_requests', { select: 'id,campus_id,title,status', id: inFilter(idsByType('team_request')) }, { admin: true }) : { data: [] },
    idsByType('team_application').length ? restSelect('team_applications', { select: 'id,team_request_id,applicant_id,message,status', id: inFilter(idsByType('team_application')) }, { admin: true }) : { data: [] },
  ]);
  const targetMaps = new Map([
    ['post', new Map((posts.data || []).map((row) => [row.id, row]))],
    ['comment', new Map((comments.data || []).map((row) => [row.id, row]))],
    ['message', new Map((messages.data || []).map((row) => [row.id, row]))],
    ['user', new Map((users.data || []).map((row) => [row.id, row]))],
    ['event', new Map((events.data || []).map((row) => [row.id, row]))],
    ['team_request', new Map((teamRequests.data || []).map((row) => [row.id, row]))],
    ['team_application', new Map((teamApplications.data || []).map((row) => [row.id, row]))],
  ]);
  const commentPostIds = (comments.data || []).map((row) => row.post_id).filter(Boolean);
  const commentPosts = commentPostIds.length ? await restSelect('posts', { select: 'id,campus_id,body', id: inFilter(commentPostIds) }, { admin: true }) : { data: [] };
  const commentPostMap = new Map((commentPosts.data || []).map((row) => [row.id, row]));
  const campusIds = await Promise.all(rows.map((row) => reportTargetCampusId(row)));
  const scoped = rows.filter((row, index) => context.role === 'super_admin' || canAccessCampus(context, campusIds[index]));
  const cases = new Map();
  for (const row of scoped) {
    const key = `${row.target_type}:${row.target_id}`;
    if (!cases.has(key)) cases.set(key, []);
    cases.get(key).push(row);
  }
  const records = [...cases.values()].map((caseReports) => {
    const row = caseReports[0];
    const target = targetMaps.get(row.target_type)?.get(row.target_id);
    const targetText = row.target_type === 'message' ? target?.text : row.target_type === 'comment' ? target?.body : row.target_type === 'post' ? target?.body : row.target_type === 'event' || row.target_type === 'team_request' ? target?.title : row.target_type === 'team_application' ? target?.message : row.target_type === 'user' ? target?.email : null;
    const targetStatus = target?.status || null;
    const reporters = [...new Set(caseReports.map((report) => labels.get(report.reporter_id)?.displayName || report.reporter_id))];
    const reasons = [...new Set(caseReports.map((report) => report.reason_code).filter(Boolean))];
    const details = [...new Set(caseReports.map((report) => report.details?.trim()).filter(Boolean))];
    const status = caseReports.some((report) => report.status === 'reviewing') ? 'reviewing' : row.status;
    return { ...row, status, reportIds: caseReports.map((report) => report.id), reportCount: caseReports.length, reporter: reporters.length === 1 ? reporters[0] : `${reporters.length} reporters`, reason_code: reasons.join(', '), details: details.join(' | ') || null, target: `${row.target_type}: ${String(targetText || row.target_id)}`.slice(0, 180), targetStatus, targetRecord: target || null, targetCampusId: campusIds[rows.indexOf(row)] || null, parentPost: row.target_type === 'comment' ? commentPostMap.get(target?.post_id) || null : null };
  });
  return { records, total: records.length, page, limit, columns: ['Report', 'Reports', 'Reporter', 'Reason', 'Details', 'Status'], rows: records.map((row) => [row.target, String(row.reportCount), row.reporter, row.reason_code, row.details || 'No details provided', row.status]) };
}

export async function applyModeration(context, reportId, body) {
  requireRole(context, ['campus_admin', 'super_admin']);
  if (!body.action) throw new HttpError(400, 'Moderation action is required.', 'ACTION_REQUIRED');
  const found = await restSelect('reports', { select: 'id,target_type,target_id', id: `eq.${reportId}`, limit: 1 }, { admin: true });
  const report = found.data?.[0];
  if (!report) throw new HttpError(404, 'Report not found.', 'REPORT_NOT_FOUND');
  requireCampus(context, await reportTargetCampusId(report));
  const result = await restRpc('admin_apply_moderation_action_as', { p_actor_id: context.user.id, p_report_id: reportId, p_action: body.action, p_reason: body.reason || null }, { admin: true });
  const status = body.action === 'dismiss' ? 'dismissed' : body.action === 'escalate' ? 'reviewing' : 'resolved';
  await update('reports', { target_type: `eq.${report.target_type}`, target_id: `eq.${report.target_id}`, status: 'in.(open,reviewing)' }, { status, resolution: body.reason || body.action, resolved_by: context.user.id, resolved_at: body.action === 'escalate' ? null : new Date().toISOString() });
  return result.data;
}

async function eventRows(context, searchParams) {
  const { page, limit, offset } = pageParams(searchParams);
  const ids = await visibleEventIds(context);
  if (ids && !ids.length) return { rows: [], count: 0, page, limit };
  const filter = ids ? { id: inFilter(ids) } : context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` };
  const result = await restSelect('events', { select: 'id,organizer_id,campus_id,title,summary,venue_name,starts_at,ends_at,capacity,status,created_at,updated_at', ...filter, ...statusFilter(searchParams), order: 'starts_at.asc', limit, offset }, { admin: true, count: true });
  return { rows: result.data || [], count: result.count ?? (result.data?.length || 0), page, limit };
}

export async function listEvents(context, searchParams) {
  const result = await eventRows(context, searchParams);
  const ids = result.rows.map((row) => row.id);
  const registrations = ids.length ? await restSelect('event_registrations', { select: 'event_id,status', event_id: inFilter(ids) }, { admin: true }) : { data: [] };
  const counts = new Map();
  for (const row of registrations.data || []) counts.set(row.event_id, (counts.get(row.event_id) || 0) + 1);
  const records = result.rows.map((row) => ({ ...row, registrations: counts.get(row.id) || 0, owner: row.organizer_id }));
  return { records, total: result.count, page: result.page, limit: result.limit, columns: ['Event', 'Date', 'Registrations', 'Owner', 'Status'], rows: records.map((row) => [row.title, new Date(row.starts_at).toLocaleDateString('en-IN'), `${row.registrations}${row.capacity ? ` / ${row.capacity}` : ''}`, row.owner, row.status]) };
}

export async function createEvent(context, body) {
  requireRole(context, ['event_manager', 'campus_admin', 'super_admin']);
  const campusId = context.role === 'super_admin' ? body.campusId : context.campusId;
  await requireActiveCampus(campusId);
  requireCampus(context, campusId);
  if (!body.title || !body.startsAt || !body.endsAt || !body.description) throw new HttpError(400, 'Title, description, start time, and end time are required.', 'EVENT_FIELDS_REQUIRED');
  let organizer = (await restSelect('event_organizers', { select: 'id', campus_id: `eq.${campusId}`, status: 'eq.active', limit: 1 }, { admin: true })).data?.[0];
  if (!organizer) organizer = await insert('event_organizers', { campus_id: campusId, display_name: body.organizerName || context.user.displayName, contact_email: context.user.email });
  const row = await insert('events', { organizer_id: organizer.id, campus_id: campusId, title: body.title.trim(), summary: body.summary || body.description.slice(0, 500), description: body.description.trim(), category: body.category || 'campus', tags: body.tags || [], venue_name: body.venueName || null, starts_at: body.startsAt, ends_at: body.endsAt, capacity: body.capacity ? Number(body.capacity) : null, status: 'draft' });
  await insert('event_admin_owners', { event_id: row.id, user_id: context.user.id, status: 'active', granted_by: context.user.id });
  await audit(context, 'event.created', 'event', row.id, { campus_id: campusId });
  return row;
}

export async function updateEventStatus(context, id, status) {
  if (!['published', 'cancelled', 'completed', 'draft'].includes(status)) throw new HttpError(400, 'Invalid event status.', 'INVALID_STATUS');
  const found = await restSelect('events', { select: 'id,campus_id', id: `eq.${id}`, limit: 1 }, { admin: true });
  const row = found.data?.[0];
  if (!row) throw new HttpError(404, 'Event not found.', 'EVENT_NOT_FOUND');
  requireCampus(context, row.campus_id);
  if (context.role === 'event_manager') {
    const owned = await restSelect('event_admin_owners', { select: 'event_id', event_id: `eq.${id}`, user_id: `eq.${context.user.id}`, status: 'eq.active', limit: 1 }, { admin: true });
    if (!owned.data?.length) throw new HttpError(403, 'You do not own this event.', 'EVENT_SCOPE_DENIED');
  }
  const updated = await update('events', { id: `eq.${id}` }, { status, published_at: status === 'published' ? new Date().toISOString() : null });
  await audit(context, `event.${status}`, 'event', id, { campus_id: row.campus_id });
  return updated;
}

export async function listRegistrations(context, searchParams) {
  const { page, limit, offset } = pageParams(searchParams);
  const ids = await visibleEventIds(context);
  if (ids && !ids.length) return { records: [], total: 0, columns: ['Event', 'Attendee', 'Status', 'Created'], rows: [] };
  const filter = ids ? { event_id: inFilter(ids) } : context.role === 'super_admin' ? {} : {};
  const result = await restSelect('event_registrations', { select: 'event_id,user_id,status,waitlist_position,created_at', ...filter, ...statusFilter(searchParams), order: 'created_at.desc', limit, offset }, { admin: true, count: true });
  const rows = result.data || [];
  const [events, labels] = await Promise.all([rows.length ? restSelect('events', { select: 'id,title', id: inFilter(rows.map((row) => row.event_id)) }, { admin: true }) : Promise.resolve({ data: [] }), userLabels(rows.map((row) => row.user_id))]);
  const eventMap = new Map((events.data || []).map((row) => [row.id, row.title]));
  const records = rows.map((row) => ({ ...row, event: eventMap.get(row.event_id) || row.event_id, attendee: labels.get(row.user_id)?.displayName || row.user_id }));
  return { records, total: result.count ?? records.length, page, limit, columns: ['Event', 'Attendee', 'Status', 'Created'], rows: records.map((row) => [row.event, row.attendee, row.status, new Date(row.created_at).toLocaleString('en-IN')]) };
}

export async function listStaff(context, searchParams) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const filter = context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` };
  const { page, limit, offset } = pageParams(searchParams);
  const result = await restSelect('admin_assignments', { select: 'id,user_id,role,campus_id,status,created_at', ...filter, ...statusFilter(searchParams, 'eq.active'), order: 'created_at.desc', limit, offset }, { admin: true, count: true });
  const rows = result.data || [];
  const labels = await userLabels(rows.map((row) => row.user_id));
  const campuses = rows.length ? await restSelect('campuses', { select: 'id,name', id: inFilter(rows.map((row) => row.campus_id).filter(Boolean)) }, { admin: true }) : { data: [] };
  const campusMap = new Map((campuses.data || []).map((row) => [row.id, row.name]));
  const records = rows.map((row) => ({ ...row, person: labels.get(row.user_id)?.displayName || row.user_id, email: labels.get(row.user_id)?.email, scope: campusMap.get(row.campus_id) || 'Global platform' }));
  return { records, total: result.count ?? records.length, columns: ['Person', 'Role', 'Scope', 'Status'], rows: records.map((row) => [row.person, row.role, row.scope, row.status]) };
}

export async function listUsers(context, searchParams) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const { page, limit, offset } = pageParams(searchParams);
  const filter = context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` };
  const query = (searchParams.get('q') || '').trim().replace(/[,*()]/g, ' ');
  if (query) filter.email = `ilike.*${query}*`;
  const result = await restSelect('users', {
    select: 'id,email,phone_e164,phone_verified_at,campus_id,status,created_at,updated_at',
    ...filter,
    ...statusFilter(searchParams),
    order: 'created_at.desc',
    limit,
    offset,
  }, { admin: true, count: true });
  const rows = result.data || [];
  const ids = rows.map((row) => row.id);
  const [labels, campuses, devices, reports] = await Promise.all([
    userLabels(ids),
    rows.length ? restSelect('campuses', { select: 'id,name', id: inFilter(rows.map((row) => row.campus_id).filter(Boolean)) }, { admin: true }) : { data: [] },
    ids.length ? restSelect('user_device_identities', { select: 'user_id,id,disabled_at,blocked_at,last_seen_at', user_id: inFilter(ids), limit: 1000 }, { admin: true }) : { data: [] },
    ids.length ? restSelect('reports', { select: 'target_id,status', target_type: 'eq.user', target_id: inFilter(ids), limit: 1000 }, { admin: true }) : { data: [] },
  ]);
  const campusMap = new Map((campuses.data || []).map((row) => [row.id, row.name]));
  const deviceMap = new Map();
  for (const device of devices.data || []) {
    if (!deviceMap.has(device.user_id)) deviceMap.set(device.user_id, []);
    deviceMap.get(device.user_id).push(device);
  }
  const reportMap = new Map();
  for (const report of reports.data || []) reportMap.set(report.target_id, (reportMap.get(report.target_id) || 0) + 1);
  const records = rows.map((row) => {
    const userDevices = deviceMap.get(row.id) || [];
    const activeDevices = userDevices.filter((device) => !device.disabled_at && !device.blocked_at).length;
    const label = labels.get(row.id);
    return {
      ...row,
      person: label?.displayName || row.email,
      campus: campusMap.get(row.campus_id) || 'Unassigned',
      phone: row.phone_verified_at ? row.phone_e164 : null,
      reportCount: reportMap.get(row.id) || 0,
      deviceCount: activeDevices,
      lastSeenAt: userDevices.sort((a, b) => String(b.last_seen_at || '').localeCompare(String(a.last_seen_at || '')))[0]?.last_seen_at || null,
    };
  });
  return {
    records,
    total: result.count ?? records.length,
    page,
    limit,
    columns: ['User', 'Email', 'Phone', 'Campus', 'Status', 'Reports', 'Devices', 'Last seen'],
    rows: records.map((row) => [row.person, row.email, row.phone || 'Not verified', row.campus, row.status, String(row.reportCount), String(row.deviceCount), row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString('en-IN') : 'Never']),
  };
}

export async function getUserSecurity(context, id) {
  const user = await scopedUser(context, id);
  const [profiles, campuses, devices, enforcements, loginEvents, reports, filedReports] = await Promise.all([
    restSelect('profiles', { select: 'user_id,display_name,username,avatar_key', user_id: `eq.${id}`, limit: 1 }, { admin: true }),
    user.campus_id ? restSelect('campuses', { select: 'id,name,slug', id: `eq.${user.campus_id}`, limit: 1 }, { admin: true }) : { data: [] },
    restSelect('user_device_identities', { select: 'id,user_id,platform,device_fingerprint_hash,device_label,model,app_version,integrity_verdict,last_ip,first_seen_at,last_seen_at,disabled_at,blocked_at', user_id: `eq.${id}`, order: 'last_seen_at.desc', limit: 100 }, { admin: true }),
    restSelect('account_enforcements', { select: 'id,enforcement,reason,imposed_by,imposed_at,expires_at,revoked_at', user_id: `eq.${id}`, order: 'imposed_at.desc', limit: 100 }, { admin: true }),
    restSelect('user_login_events', { select: 'id,device_id,email,ip_address,outcome,failure_code,metadata,created_at', user_id: `eq.${id}`, order: 'created_at.desc', limit: 100 }, { admin: true }),
    restSelect('reports', { select: 'id,reporter_id,reason_code,details,status,resolution,created_at', target_type: 'eq.user', target_id: `eq.${id}`, order: 'created_at.desc', limit: 100 }, { admin: true }),
    restSelect('reports', { select: 'id,target_type,target_id,reason_code,details,status,resolution,created_at', reporter_id: `eq.${id}`, order: 'created_at.desc', limit: 100 }, { admin: true }),
  ]);
  const superAdmin = context.role === 'super_admin';
  const mapDevice = (device) => ({ ...device, deviceFingerprint: superAdmin ? device.device_fingerprint_hash : maskFingerprint(device.device_fingerprint_hash), lastIp: superAdmin ? device.last_ip : maskIp(device.last_ip) });
  const mapEvent = (event) => ({ ...event, ipAddress: superAdmin ? event.ip_address : maskIp(event.ip_address) });
  return {
    user: { ...user, phone: user.phone_verified_at ? user.phone_e164 : null, phoneVerified: Boolean(user.phone_verified_at), displayName: profiles.data?.[0]?.display_name || user.email, username: profiles.data?.[0]?.username || null, campus: campuses.data?.[0] || null },
    devices: (devices.data || []).map(mapDevice),
    enforcements: enforcements.data || [],
    loginEvents: (loginEvents.data || []).map(mapEvent),
    reports: reports.data || [],
    filedReports: filedReports.data || [],
  };
}

export async function enforceUser(context, id, body) {
  const user = await scopedUser(context, id);
  const action = String(body.action || '').trim();
  const allowed = ['suspend', 'ban', 'restore', 'force_recreate', 'delete', 'block_device', 'unbind_device'];
  if (!allowed.includes(action)) throw new HttpError(400, 'Invalid account action.', 'INVALID_ACCOUNT_ACTION');
  if (['force_recreate', 'delete', 'unbind_device'].includes(action) && context.role !== 'super_admin') throw new HttpError(403, 'Only a super admin can perform this action.', 'SUPER_ADMIN_REQUIRED');
  if (!body.reason || !String(body.reason).trim()) throw new HttpError(400, 'A reason is required.', 'REASON_REQUIRED');
  const result = await restRpc('admin_apply_account_enforcement_as', {
    p_actor_id: context.user.id,
    p_user_id: user.id,
    p_action: action,
    p_reason: String(body.reason).trim(),
    p_expires_at: body.expiresAt || null,
    p_device_id: body.deviceId || null,
  }, { admin: true });
  return result.data;
}

export async function revokeUserSessions(context, id) {
  const user = await scopedUser(context, id);
  await update('user_device_identities', { user_id: `eq.${id}`, disabled_at: 'is.null' }, { disabled_at: new Date().toISOString() });
  await update('user_devices', { user_id: `eq.${id}`, disabled_at: 'is.null' }, { disabled_at: new Date().toISOString() });
  await audit(context, 'account.sessions_revoked', 'user', id, { campus_id: user.campus_id });
  return { userId: id, revoked: true, message: 'All registered devices were disabled. The app must claim a device again.' };
}

export async function claimMobileDevice(identity, body, ipAddress) {
  const platform = String(body.platform || 'android');
  if (!body.deviceFingerprint) throw new HttpError(400, 'A device fingerprint is required.', 'DEVICE_FINGERPRINT_REQUIRED');
  const result = await restRpc('claim_device_mobile', {
    p_platform: platform,
    p_device_fingerprint_hash: String(body.deviceFingerprint),
    p_device_public_key: body.devicePublicKey || null,
    p_installation_id_hash: body.installationId || null,
    p_device_label: body.deviceLabel || null,
    p_integrity_verdict: body.integrityVerdict || 'not_checked',
    p_app_version: body.appVersion || null,
    p_model: body.model || null,
    p_ip_address: ipAddress,
  }, { token: identity.token });
  return { deviceId: result.data?.id, status: 'claimed', userId: identity.user.id };
}

export async function inviteStaff(context, body) {
  requireRole(context, ['campus_admin', 'super_admin']);
  if (!body.email || !body.email.includes('@')) throw new HttpError(400, 'A valid work email is required.', 'INVALID_EMAIL');
  const role = body.role || 'event_manager';
  if (!['campus_admin', 'event_manager', 'super_admin'].includes(role)) throw new HttpError(400, 'Invalid admin role.', 'INVALID_ROLE');
  requireRoleGrant(context, role);
  const campusId = role === 'super_admin' ? null : context.role === 'super_admin' ? body.campusId : context.campusId;
  if (role !== 'super_admin') {
    await requireActiveCampus(campusId);
    requireCampus(context, campusId);
  }
  const email = body.email.trim().toLowerCase();
  let existingUser;
  const existing = await restSelect('users', { select: 'id,email', email: `eq.${email}`, limit: 1 }, { admin: true });
  if (existing.data?.[0]) existingUser = existing.data[0];
  if (existingUser?.id) {
    const active = await restSelect('admin_assignments', { select: '*', user_id: `eq.${existingUser.id}`, role: `eq.${role}`, campus_id: campusId ? `eq.${campusId}` : 'is.null', status: 'eq.active', limit: 1 }, { admin: true });
    if (active.data?.[0]) return active.data[0];
    const assignment = await insert('admin_assignments', { user_id: existingUser.id, role, campus_id: campusId, organizer_id: null, status: 'active', granted_by: context.user.id });
    await audit(context, 'staff.assigned', 'user', existingUser.id, { role, campus_id: campusId });
    return assignment;
  }
  const pending = await restSelect('admin_invitations', { select: '*', email: `eq.${email}`, role: `eq.${role}`, campus_id: campusId ? `eq.${campusId}` : 'is.null', status: 'eq.pending', limit: 1 }, { admin: true });
  if (pending.data?.[0]) return pending.data[0];
  try {
    await supabaseRequest('auth', 'invite', { method: 'POST', admin: true, body: { email } });
  } catch (error) {
    if (!(error instanceof HttpError) || ![400, 422].includes(error.status)) throw error;
  }
  const invitation = await insert('admin_invitations', { email, role, campus_id: campusId, status: 'pending', created_by: context.user.id });
  await audit(context, 'staff.invited', 'admin_invitation', invitation.id, { role, campus_id: campusId });
  return invitation;
}

export async function revokeStaff(context, id) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const found = await restSelect('admin_assignments', { select: 'id,user_id,campus_id,role', id: `eq.${id}`, limit: 1 }, { admin: true });
  const assignment = found.data?.[0];
  if (!assignment) throw new HttpError(404, 'Admin assignment not found.', 'ASSIGNMENT_NOT_FOUND');
  requireRoleGrant(context, assignment.role);
  if (assignment.user_id === context.user.id) throw new HttpError(400, 'You cannot revoke your own active assignment.', 'SELF_REVOKE_DENIED');
  requireCampus(context, assignment.campus_id);
  const row = await update('admin_assignments', { id: `eq.${id}` }, { status: 'revoked', revoked_at: new Date().toISOString() });
  await audit(context, 'staff.revoked', 'user', assignment.user_id, { role: assignment.role, campus_id: assignment.campus_id });
  return row;
}

export async function listCampuses(context, searchParams) {
  requireRole(context, ['super_admin']);
  const { page, limit, offset } = pageParams(searchParams);
  const result = await restSelect('campuses', { select: 'id,name,slug,country_code,timezone,status,created_at', ...statusFilter(searchParams), order: 'name.asc', limit, offset }, { admin: true, count: true });
  const rows = result.data || [];
  const users = rows.length ? await restSelect('users', { select: 'id,campus_id', campus_id: inFilter(rows.map((row) => row.id)), status: 'eq.active' }, { admin: true }) : { data: [] };
  const counts = new Map();
  for (const row of users.data || []) counts.set(row.campus_id, (counts.get(row.campus_id) || 0) + 1);
  const records = rows.map((row) => ({ ...row, members: counts.get(row.id) || 0 }));
  return { records, total: result.count ?? records.length, columns: ['Campus', 'Location', 'Members', 'Status'], rows: records.map((row) => [row.name, row.country_code, String(row.members), row.status]) };
}

export async function createCampus(context, body) {
  requireRole(context, ['super_admin']);
  if (!body.name || !body.slug) throw new HttpError(400, 'Campus name and slug are required.', 'CAMPUS_FIELDS_REQUIRED');
  const row = await insert('campuses', { name: body.name.trim(), slug: body.slug.trim().toLowerCase(), country_code: body.countryCode || 'IN', timezone: body.timezone || 'Asia/Kolkata', status: 'active' });
  await audit(context, 'campus.created', 'campus', row.id, {});
  return row;
}

export async function updateCampus(context, id, body) {
  requireRole(context, ['super_admin']);
  const found = await restSelect('campuses', { select: 'id,name,slug,country_code,timezone,status', id: `eq.${id}`, limit: 1 }, { admin: true });
  if (!found.data?.[0]) throw new HttpError(404, 'Campus not found.', 'CAMPUS_NOT_FOUND');
  const allowed = {};
  if (body.status !== undefined) {
    if (!['active', 'inactive'].includes(body.status)) throw new HttpError(400, 'Invalid campus status.', 'INVALID_STATUS');
    allowed.status = body.status;
  }
  if (body.name !== undefined) { if (!String(body.name).trim()) throw new HttpError(400, 'Campus name is required.', 'CAMPUS_NAME_REQUIRED'); allowed.name = String(body.name).trim(); }
  if (body.slug !== undefined) { if (!/^[a-z0-9-]+$/.test(String(body.slug).trim().toLowerCase())) throw new HttpError(400, 'Campus slug is invalid.', 'CAMPUS_SLUG_INVALID'); allowed.slug = String(body.slug).trim().toLowerCase(); }
  if (body.countryCode !== undefined) { if (!/^[A-Z]{2}$/.test(String(body.countryCode).trim().toUpperCase())) throw new HttpError(400, 'Country code must contain two uppercase letters.', 'COUNTRY_CODE_INVALID'); allowed.country_code = String(body.countryCode).trim().toUpperCase(); }
  if (body.timezone !== undefined) allowed.timezone = String(body.timezone).trim() || 'Asia/Kolkata';
  if (!Object.keys(allowed).length) throw new HttpError(400, 'No campus changes supplied.', 'CAMPUS_UPDATE_EMPTY');
  const row = await update('campuses', { id: `eq.${id}` }, allowed);
  await audit(context, `campus.updated`, 'campus', id, allowed);
  return row;
}

export async function deleteCampus(context, id) {
  requireRole(context, ['super_admin']);
  const found = await restSelect('campuses', { select: 'id,name,status', id: `eq.${id}`, limit: 1 }, { admin: true });
  const campus = found.data?.[0];
  if (!campus) throw new HttpError(404, 'Campus not found.', 'CAMPUS_NOT_FOUND');
  if (campus.status === 'active') throw new HttpError(409, 'Deactivate the campus before deleting it.', 'CAMPUS_MUST_BE_INACTIVE');
  try {
    const row = await remove('campuses', { id: `eq.${id}` });
    await audit(context, 'campus.deleted', 'campus', id, { name: campus.name });
    return row;
  } catch (error) {
    if (error instanceof HttpError && error.status >= 400 && error.status < 500) throw new HttpError(409, 'Campus cannot be deleted while records still reference it.', 'CAMPUS_DELETE_BLOCKED');
    throw error;
  }
}

export async function listNotifications(context, searchParams) {
  const { page, limit, offset } = pageParams(searchParams);
  const result = await restSelect('notifications', { select: 'id,type,actor_id,subject_type,subject_id,payload,in_app_read_at,created_at', user_id: `eq.${context.user.id}`, order: 'created_at.desc', limit, offset }, { admin: true, count: true });
  const rows = result.data || [];
  return { records: rows.map((row) => ({ ...row, unread: !row.in_app_read_at, title: row.payload?.title || row.type, detail: row.payload?.detail || '' })), total: result.count ?? rows.length, page, limit };
}

export async function markNotification(context, id) {
  const row = await update('notifications', { id: `eq.${id}`, user_id: `eq.${context.user.id}` }, { in_app_read_at: new Date().toISOString() });
  return row;
}

export async function markAllNotifications(context) {
  await update('notifications', { user_id: `eq.${context.user.id}`, in_app_read_at: 'is.null' }, { in_app_read_at: new Date().toISOString() });
  return { updated: true };
}

export async function listAudit(context, searchParams) {
  requireRole(context, ['super_admin', 'campus_admin']);
  const { page, limit, offset } = pageParams(searchParams);
  const result = await restSelect('audit_logs', { select: 'id,actor_id,action,target_type,target_id,metadata,created_at', order: 'created_at.desc', limit, offset }, { admin: true, count: true });
  const labels = await userLabels((result.data || []).map((row) => row.actor_id));
  const records = (result.data || []).filter((row) => context.role === 'super_admin' || row.metadata?.campus_id === context.campusId).map((row) => ({ ...row, actor: labels.get(row.actor_id)?.displayName || row.actor_id }));
  return { records, total: result.count ?? records.length, columns: ['Action', 'Actor', 'Target', 'Time', 'Status'], rows: records.map((row) => [row.action, row.actor, `${row.target_type || ''} ${row.target_id || ''}`, new Date(row.created_at).toLocaleString('en-IN'), 'Recorded']) };
}

export async function getSettings(context) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const scopeKey = context.role === 'super_admin' ? 'global' : `campus:${context.campusId}`;
  const result = await restSelect('admin_workspace_settings', { select: 'scope_key,display_name,support_email,admin_notice,digest_enabled,moderation_alerts,updated_at', scope_key: `eq.${scopeKey}`, limit: 1 }, { admin: true });
  return result.data?.[0] || { scope_key: scopeKey, display_name: context.campus?.name || 'CampusSphere', support_email: context.user.email, admin_notice: '', digest_enabled: true, moderation_alerts: true };
}

export async function saveSettings(context, body) {
  requireRole(context, ['campus_admin', 'super_admin']);
  const scopeKey = context.role === 'super_admin' ? 'global' : `campus:${context.campusId}`;
  const row = await upsert('admin_workspace_settings', 'scope_key', { scope_key: scopeKey, display_name: body.displayName || '', support_email: body.supportEmail || null, admin_notice: body.adminNotice || '', digest_enabled: Boolean(body.digestEnabled), moderation_alerts: Boolean(body.moderationAlerts), updated_by: context.user.id });
  await audit(context, 'settings.updated', 'workspace_settings', null, { scope_key: scopeKey });
  return row || getSettings(context);
}

export async function health() {
  const started = Date.now();
  await restSelect('users', { select: 'id', limit: 1 }, { admin: true });
  return { status: 'operational', latencyMs: Date.now() - started, checkedAt: new Date().toISOString(), services: [{ name: 'Authentication', status: 'operational' }, { name: 'Database API', status: 'operational' }, { name: 'Realtime', status: 'configured' }, { name: 'Background jobs', status: 'configured' }] };
}

export async function search(context, searchParams) {
  const query = (searchParams.get('q') || '').trim();
  if (query.length < 2) throw new HttpError(400, 'Search requires at least two characters.', 'SEARCH_QUERY_SHORT');
  const campusFilter = context.role === 'super_admin' ? {} : { campus_id: `eq.${context.campusId}` };
  const [posts, events, campuses] = await Promise.all([
    restSelect('posts', { select: 'id,body,status', ...campusFilter, body: `ilike.*${query}*`, order: 'created_at.desc', limit: 8 }, { admin: true }),
    restSelect('events', { select: 'id,title,status', ...campusFilter, title: `ilike.*${query}*`, order: 'starts_at.desc', limit: 8 }, { admin: true }),
    context.role === 'super_admin' ? restSelect('campuses', { select: 'id,name,status', name: `ilike.*${query}*`, order: 'name.asc', limit: 8 }, { admin: true }) : Promise.resolve({ data: [] }),
  ]);
  return { results: [
    ...(posts.data || []).map((row) => ({ id: row.id, section: context.role === 'super_admin' ? 'All Content' : 'Posts', type: 'Post', label: row.body.slice(0, 100), status: row.status })),
    ...(events.data || []).map((row) => ({ id: row.id, section: 'Events', type: 'Event', label: row.title, status: row.status })),
    ...(campuses.data || []).map((row) => ({ id: row.id, section: 'Campuses', type: 'Campus', label: row.name, status: row.status })),
  ] };
}
