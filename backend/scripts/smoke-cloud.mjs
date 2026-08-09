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

async function expectDenied(label, path, body) {
  const { response, body: result } = await request(path, accessToken, {
    method: 'POST',
    body,
    headers: { Prefer: 'return=minimal' },
  });
  if (response.ok) throw new Error(`${label}: student write unexpectedly succeeded`);
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

  await expectDenied('student event authoring denied', '/rest/v1/events', {
    title: 'CampusSphere authorization smoke test',
    status: 'published',
  });

  if (secondAccessToken) {
    const secondUser = await expectOk('second authenticated user', '/auth/v1/user', secondAccessToken);
    if (secondUser?.id === userId) throw new Error('second test token belongs to the same user');
    const privateRows = await expectOk('cross-user profile visibility', `/rest/v1/profiles?select=user_id,profile_visibility&user_id=eq.${encodeURIComponent(userId)}&limit=1`, secondAccessToken);
    if (Array.isArray(privateRows) && privateRows.length > 0 && privateRows[0].profile_visibility === 'private') {
      throw new Error('private profile leaked to the second user');
    }
  }

  console.log(checks.join('\n'));
  console.log(`Cloud smoke checks passed (${checks.length}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
