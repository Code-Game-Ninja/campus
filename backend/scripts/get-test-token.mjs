import process from 'node:process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.CAMPUSSPHERE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

if (!baseUrl || !anonKey) {
  console.error('Set CAMPUSSPHERE_SUPABASE_URL (or SUPABASE_URL) and CAMPUSSPHERE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY).');
  process.exit(2);
}

const rl = readline.createInterface({ input, output });
try {
  const email = (process.argv[2] ?? await rl.question('Student email: ')).trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('A valid student email is required.');

  const otpResponse = await fetch(`${baseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!otpResponse.ok) throw new Error(`OTP request failed (${otpResponse.status}): ${await otpResponse.text()}`);

  const code = (await rl.question('Enter the OTP sent to that email: ')).trim();
  const verifyResponse = await fetch(`${baseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token: code, type: 'email' }),
  });
  const payload = await verifyResponse.json().catch(() => null);
  if (!verifyResponse.ok || !payload?.access_token) {
    throw new Error(`OTP verification failed (${verifyResponse.status}): ${JSON.stringify(payload)}`);
  }

  console.log('\nStudent access token (temporary JWT; keep private):');
  console.log(payload.access_token);
  console.log('\nPowerShell usage for this terminal session:');
  console.log(`$env:CAMPUSSPHERE_TEST_ACCESS_TOKEN = "${payload.access_token}"`);
  console.log('\nThis token expires. Generate a new one when it expires. Never commit it or use a service-role key.');
} finally {
  rl.close();
}
