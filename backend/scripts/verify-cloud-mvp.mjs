import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.CAMPUSSPHERE_SUPABASE_ANON_KEY ?? '';
const tokenA = process.env.CAMPUSSPHERE_TEST_ACCESS_TOKEN ?? '';
const tokenB = process.env.CAMPUSSPHERE_TEST_ACCESS_TOKEN_2 ?? '';
const eventId = process.env.CAMPUSSPHERE_TEST_EVENT_ID ?? '';

if (!baseUrl || !anonKey || !tokenA || !tokenB) {
  console.error('Set CAMPUSSPHERE_SUPABASE_URL, CAMPUSSPHERE_SUPABASE_ANON_KEY, and two student access tokens.');
  process.exit(2);
}
if (process.env.CAMPUSSPHERE_ALLOW_TEST_MUTATIONS !== '1') {
  console.error('Refusing mutation tests. Set CAMPUSSPHERE_ALLOW_TEST_MUTATIONS=1 only for dedicated test accounts.');
  process.exit(2);
}

const passes = [];
const cleanup = [];

async function request(path, token, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch { result = text; }
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${JSON.stringify(result)}`);
  return result;
}

async function storageRequest(path, token, { method = 'POST', bytes, contentType = 'application/octet-stream' } = {}) {
  const response = await fetch(`${baseUrl}/storage/v1/${path}`, {
    method,
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: bytes,
  });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch { result = text; }
  if (!response.ok) throw new Error(`${method} storage/${path}: HTTP ${response.status} ${JSON.stringify(result)}`);
  return result;
}

function rpc(name, body, token) {
  return request(`/rest/v1/rpc/${name}`, token, { method: 'POST', body });
}

async function check(label, operation) {
  const result = await operation();
  passes.push(`PASS ${label}`);
  return result;
}

async function bestEffort(operation) {
  try { await operation(); } catch (error) { console.error(`Cleanup warning: ${error instanceof Error ? error.message : error}`); }
}

try {
  const [userA, userB] = await Promise.all([
    check('student A auth', () => request('/auth/v1/user', tokenA)),
    check('student B auth', () => request('/auth/v1/user', tokenB)),
  ]);
  if (!userA?.id || !userB?.id || userA.id === userB.id) throw new Error('Two different authenticated student accounts are required.');

  const post = await check('create post with poll', () => rpc('create_post_mobile', {
    p_title: 'CampusSphere automated MVP check',
    p_body: `Automated test ${new Date().toISOString()}`,
    p_kind: 'discussion',
    p_visibility: 'campus',
    p_event_id: null,
    p_team_request_id: null,
    p_media: [],
    p_poll: { question: 'MVP ready?', allowsMultiple: false, options: ['Yes', 'Needs work'] },
  }, tokenA));
  if (!post?.id) throw new Error('create_post_mobile did not return an id');
  cleanup.push(() => rpc('delete_post_mobile', { p_post_id: post.id }, tokenA));

  const poll = await check('read poll state', () => rpc('post_poll_state_mobile', { p_post_id: post.id }, tokenB));
  const optionId = poll?.options?.[0]?.id ?? poll?.[0]?.options?.[0]?.id;
  if (!optionId) throw new Error('poll state did not return an option id');
  await check('vote poll idempotently', async () => {
    await rpc('set_post_poll_vote_mobile', { p_option_id: optionId, p_selected: true }, tokenB);
    return rpc('set_post_poll_vote_mobile', { p_option_id: optionId, p_selected: true }, tokenB);
  });
  await check('comment on post', () => rpc('create_comment_mobile', { p_post_id: post.id, p_body: 'Automated comment', p_parent_comment_id: null }, tokenB));
  await check('like post idempotently', async () => {
    await rpc('set_post_reaction_mobile', { p_post_id: post.id, p_enabled: true }, tokenB);
    return rpc('set_post_reaction_mobile', { p_post_id: post.id, p_enabled: true }, tokenB);
  });
  await check('bookmark post toggle', async () => {
    await rpc('set_bookmark_mobile', { p_target_type: 'post', p_target_id: post.id, p_bookmarked: true }, tokenB);
    return rpc('set_bookmark_mobile', { p_target_type: 'post', p_target_id: post.id, p_bookmarked: false }, tokenB);
  });
  await check('edit own post', () => rpc('update_post_mobile', { p_post_id: post.id, p_body: 'CampusSphere automated MVP check passed.', p_visibility: 'campus' }, tokenA));

  const deadline = new Date(Date.now() + 7 * 86400000).toISOString();
  const completion = new Date(Date.now() + 21 * 86400000).toISOString();
  const team = await check('create Team Finder request', () => rpc('create_team_request_mobile_v2', {
    p_title: 'Automated MVP verification team',
    p_description: 'Temporary request created by CampusSphere verification runner.',
    p_team_type: 'project',
    p_desired_member_count: 2,
    p_required_skills: [],
    p_preferred_skills: [],
    p_interests: [],
    p_commitment_level: 'flexible',
    p_availability: {},
    p_application_deadline: deadline,
    p_target_completion_date: completion,
    p_custom_questions: ['Why join?'],
  }, tokenA));
  if (!team?.id) throw new Error('create_team_request_mobile_v2 did not return an id');
  cleanup.push(() => rpc('update_team_request_mobile', { target_team_request_id: team.id, p_title: null, p_description: null, p_status: 'cancelled', p_skills: null }, tokenA));

  const application = await check('apply to team', () => rpc('apply_to_team_mobile', {
    p_team_request_id: team.id,
    p_message: 'Automated application',
    p_selected_skills: [],
    p_answers: { 'Why join?': 'Verification' },
  }, tokenB));
  if (!application?.id) throw new Error('apply_to_team_mobile did not return an id');
  await check('owner accepts application', () => rpc('decide_team_application', { target_application_id: application.id, decision: 'accepted' }, tokenA));

  const conversation = await check('team chat synchronized', () => rpc('ensure_team_conversation', { target_team_request_id: team.id }, tokenB));
  if (!conversation?.id) throw new Error('ensure_team_conversation did not return an id');
  const clientMessageId = `mvp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const message = await check('send idempotent chat message', async () => {
    const first = await rpc('send_message', {
      target_conversation_id: conversation.id,
      target_client_message_id: clientMessageId,
      target_message_type: 'text',
      target_text: 'CampusSphere automated chat check',
      target_link_url: null,
      target_reply_to_message_id: null,
      target_metadata: {},
    }, tokenB);
    const second = await rpc('send_message', {
      target_conversation_id: conversation.id,
      target_client_message_id: clientMessageId,
      target_message_type: 'text',
      target_text: 'CampusSphere automated chat check',
      target_link_url: null,
      target_reply_to_message_id: null,
      target_metadata: {},
    }, tokenB);
    if (first?.id !== second?.id) throw new Error('message client id did not deduplicate');
    return first;
  });
  const storageKey = `${conversation.id}/${userB.id}/mvp-${Date.now()}.txt`;
  await check('upload private chat attachment', () => storageRequest(`object/chat-attachments/${storageKey}`, tokenB, {
    bytes: new TextEncoder().encode('CampusSphere private attachment check'),
    contentType: 'text/plain',
  }));
  cleanup.push(() => storageRequest(`object/chat-attachments/${storageKey}`, tokenB, { method: 'DELETE' }));
  await check('attach private file metadata', () => rpc('attach_message_file', {
    target_message_id: message.id,
    target_storage_key: storageKey,
    target_file_name: 'mvp-check.txt',
    target_mime_type: 'text/plain',
    target_byte_size: 37,
    target_metadata: { automated: true },
  }, tokenB));
  await check('create signed attachment URL', () => request(`/storage/v1/object/sign/chat-attachments/${storageKey}`, tokenA, {
    method: 'POST', body: { expiresIn: 60 },
  }));
  await check('edit chat message', () => rpc('edit_message', { target_message_id: message.id, replacement_text: 'CampusSphere automated chat check edited' }, tokenB));
  await check('message reaction toggle', async () => {
    await rpc('set_message_reaction', { target_message_id: message.id, target_reaction: 'like', enabled: true }, tokenA);
    return rpc('set_message_reaction', { target_message_id: message.id, target_reaction: 'like', enabled: false }, tokenA);
  });
  await check('mark conversation read', () => rpc('mark_conversation_read', { target_conversation_id: conversation.id, through_message_id: message.id }, tokenA));
  await check('mute conversation toggle', async () => {
    await rpc('set_chat_mute_mobile', { p_conversation_id: conversation.id, p_muted: true }, tokenA);
    return rpc('set_chat_mute_mobile', { p_conversation_id: conversation.id, p_muted: false }, tokenA);
  });
  await check('delete own chat message', () => rpc('delete_message', { target_message_id: message.id }, tokenB));

  await check('follow toggle', async () => {
    await rpc('set_follow_mobile', { p_target_user_id: userB.id, p_following: true }, tokenA);
    return rpc('set_follow_mobile', { p_target_user_id: userB.id, p_following: false }, tokenA);
  });
  await check('block toggle', async () => {
    await rpc('set_block_mobile', { p_target_user_id: userB.id, p_blocked: true }, tokenA);
    return rpc('set_block_mobile', { p_target_user_id: userB.id, p_blocked: false }, tokenA);
  });

  if (eventId) {
    await check('event bookmark toggle', async () => {
      await rpc('set_bookmark_mobile', { p_target_type: 'event', p_target_id: eventId, p_bookmarked: true }, tokenA);
      return rpc('set_bookmark_mobile', { p_target_type: 'event', p_target_id: eventId, p_bookmarked: false }, tokenA);
    });
    await check('event reminder toggle', async () => {
      await rpc('set_event_reminder_mobile', { p_event_id: eventId, p_enabled: true, p_minutes_before: 60 }, tokenA);
      return rpc('set_event_reminder_mobile', { p_event_id: eventId, p_enabled: false, p_minutes_before: 60 }, tokenA);
    });
    await check('event registration lifecycle', async () => {
      await rpc('register_for_event', { target_event_id: eventId }, tokenA);
      return rpc('cancel_event_registration', { target_event_id: eventId }, tokenA);
    });
  } else {
    console.log('SKIP event mutations: CAMPUSSPHERE_TEST_EVENT_ID not set.');
  }

  console.log(passes.join('\n'));
  console.log(`Cloud MVP mutation checks passed (${passes.length}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  for (const operation of cleanup.reverse()) await bestEffort(operation);
}
