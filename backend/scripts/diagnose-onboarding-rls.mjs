/**
 * Behavioural check for the onboarding-skip bug.
 *
 * Runs the exact identity read the mobile client performs, both the way the
 * shipped v1.0.0 APK did it (no id filter, RLS is the only scope) and the way
 * the patched client does it (explicit id filter). If the unfiltered read
 * returns a row that is not the caller's, the users RLS policy is missing on
 * the linked project and every new account inherits a stranger's onboarding
 * state.
 *
 * Usage:
 *   node scripts/diagnose-onboarding-rls.mjs <access-token>
 *   CAMPUSSPHERE_TEST_ACCESS_TOKEN=<jwt> node scripts/diagnose-onboarding-rls.mjs
 *
 * Use a normal user token from `npm run get:test-token`. Never a service-role key.
 */
import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.CAMPUSSPHERE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const token = (process.argv[2] ?? process.env.CAMPUSSPHERE_TEST_ACCESS_TOKEN ?? '').trim();

if (!baseUrl || !anonKey) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (or the EXPO_PUBLIC_ equivalents).');
  process.exit(2);
}
if (!token) {
  console.error('Pass a user access token as the first argument, or set CAMPUSSPHERE_TEST_ACCESS_TOKEN.');
  process.exit(2);
}
if (token.split('.').length !== 3) {
  console.error('That does not look like a JWT. Use a user token from `npm run get:test-token`.');
  process.exit(2);
}

function jwtSubject(value) {
  const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'));
  if (claims.role && claims.role !== 'authenticated') {
    console.error(`Refusing to run: token role is "${claims.role}". Use an ordinary user token.`);
    process.exit(2);
  }
  return { userId: claims.sub, email: claims.email };
}

async function rest(path) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

const { userId, email } = jwtSubject(token);
const select = 'select=id,campus_id,onboarding_completed_at';

const unfiltered = await rest(`users?${select}&limit=1`);
const filtered = await rest(`users?${select}&id=eq.${encodeURIComponent(userId)}&limit=1`);
const profile = await rest(`profiles?select=user_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`);

const describe = (row) => (row
  ? `id=${row.id} campus_id=${row.campus_id ?? 'null'} onboarding_completed_at=${row.onboarding_completed_at ?? 'null'}`
  : 'no row');

console.log(`caller            ${userId}${email ? ` (${email})` : ''}`);
console.log(`unfiltered read   http ${unfiltered.status}  ${describe(Array.isArray(unfiltered.body) ? unfiltered.body[0] : null)}`);
console.log(`filtered read     http ${filtered.status}  ${describe(Array.isArray(filtered.body) ? filtered.body[0] : null)}`);
console.log(`own profile row   http ${profile.status}  ${Array.isArray(profile.body) && profile.body.length ? 'present' : 'absent'}`);

if (!Array.isArray(unfiltered.body)) {
  console.log('\nInconclusive: the unfiltered read did not return a list.');
  console.log(JSON.stringify(unfiltered.body));
  process.exit(1);
}

const leaked = unfiltered.body[0];
if (leaked && leaked.id !== userId) {
  console.log('\nFAIL  The unfiltered read returned another account\'s row.');
  console.log('      public.users is missing its self-scoped select policy, or RLS is off.');
  console.log('      Apply backend/supabase/migrations/0036_assert_users_self_access.sql.');
  process.exit(1);
}

console.log('\nPASS  The unfiltered read is scoped to the caller, so RLS is intact on public.users.');
console.log('      The onboarding skip has another cause; re-check with a fresh signup.');
