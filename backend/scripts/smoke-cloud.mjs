import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.CAMPUSSPHERE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const accessToken = process.env.CAMPUSSPHERE_TEST_ACCESS_TOKEN ?? '';
const secondAccessToken = process.env.CAMPUSSPHERE_TEST_ACCESS_TOKEN_2 ?? '';

if (!baseUrl || !anonKey || !accessToken) {
  console.error('Set CAMPUSSPHERE_SUPABASE_URL, CAMPUSSPHERE_SUPABASE_ANON_KEY, and CAMPUSSPHERE_TEST_ACCESS_TOKEN.');
  process.exit(2);
}

async function request(path, token = accessToken, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

const checks = [];
async function expectOk(label, path, token = accessToken) {
  const { response, body } = await request(path, token);
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status} ${JSON.stringify(body)}`);
  checks.push(`PASS ${label}`);
  return body;
}

async function expectRpcOk(label, functionName, body = {}, token = accessToken) {
  const { response, body: result } = await request(`/rest/v1/rpc/${functionName}`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status} ${JSON.stringify(result)}`);
  checks.push(`PASS ${label}`);
  return result;
}

async function expectDenied(label, path, body, allowedStatuses = [401, 403]) {
  const { response, body: result } = await request(path, accessToken, {
    method: 'POST',
    body,
    headers: { Prefer: 'return=minimal' },
  });
  if (response.ok) throw new Error(`${label}: student write unexpectedly succeeded`);
  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`${label}: expected authorization denial, received HTTP ${response.status} ${JSON.stringify(result)}`);
  }
  checks.push(`PASS ${label} (HTTP ${response.status})`);
  return result;
}

try {
  const authUser = await expectOk('authenticated user', '/auth/v1/user');
  const userId = authUser?.id;
  if (!userId) throw new Error('authenticated user: response did not contain an id');

  await expectOk('own identity row', `/rest/v1/users?select=id,campus_id,onboarding_completed_at&id=eq.${encodeURIComponent(userId)}&limit=1`);
  await expectOk('own profile row', `/rest/v1/profiles?select=user_id,username,profile_visibility&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
  await expectOk('published event discovery', '/rest/v1/events?select=id,title,starts_at,campus_id,status&status=eq.published&order=starts_at.asc&limit=20');
  await expectOk('student feed read', '/rest/v1/posts?select=id,author_id,body,created_at&status=eq.published&order=created_at.desc&limit=20');
  await expectOk('team finder read', '/rest/v1/team_requests?select=id,owner_id,title,status&status=eq.open&order=created_at.desc&limit=20');
  await expectOk('notification read', `/rest/v1/notifications?select=id,type,in_app_read_at,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=20`);
  await expectOk('chat membership read', `/rest/v1/conversation_members?select=conversation_id,conversation:conversations(id,type,name)&user_id=eq.${encodeURIComponent(userId)}&left_at=is.null&limit=20`);
  await expectRpcOk('feed cursor RPC', 'feed_page', { p_limit: 5 });
  await expectRpcOk('event cursor RPC', 'events_page', { p_limit: 5 });
  await expectRpcOk('team cursor RPC', 'team_requests_page', { p_limit: 5 });
  await expectRpcOk('notification cursor RPC', 'notifications_page', { p_limit: 5, p_unread_only: false });
  await expectRpcOk('privacy-aware search RPC', 'search_mobile', { p_query: 'campus', p_type: 'all', p_limit: 5 });

  await expectDenied('student event authoring denied', '/rest/v1/events', {
    organizer_id: '00000000-0000-0000-0000-000000000001',
    campus_id: '00000000-0000-0000-0000-000000000001',
    title: 'CampusSphere authorization smoke test',
    description: 'This row must never be created by a mobile student.',
    category: 'authorization-test',
    starts_at: '2099-01-01T10:00:00.000Z',
    ends_at: '2099-01-01T11:00:00.000Z',
    status: 'draft',
  });

  if (secondAccessToken) {
    const secondUser = await expectOk('second authenticated user', '/auth/v1/user', secondAccessToken);
    if (secondUser?.id === userId) throw new Error('second test token belongs to the same user');
    const privateRows = await expectOk('cross-user profile visibility', `/rest/v1/profiles?select=user_id,profile_visibility&user_id=eq.${encodeURIComponent(userId)}&limit=1`, secondAccessToken);
    if (Array.isArray(privateRows) && privateRows.length > 0 && privateRows[0].profile_visibility === 'private') {
      throw new Error('private profile leaked to the second user');
    }

    const moderationQueue = await request('/rest/v1/rpc/list_moderation_queue', secondAccessToken, {
      method: 'POST', body: JSON.stringify({ p_status: 'open', p_limit: 1 }),
    });
    if (moderationQueue.response.ok) throw new Error('moderator queue exposed to normal student');
    if (![401, 403].includes(moderationQueue.response.status)) {
      throw new Error(`moderator queue denial returned HTTP ${moderationQueue.response.status}`);
    }
    checks.push(`PASS moderator queue denied (HTTP ${moderationQueue.response.status})`);
  }

  console.log(checks.join('\n'));
  console.log(`Cloud smoke checks passed (${checks.length}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
