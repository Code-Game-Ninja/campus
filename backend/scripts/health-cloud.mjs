import process from 'node:process';
const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.CAMPUSSPHERE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
if (!baseUrl || !anonKey) { console.error('Set CAMPUSSPHERE_SUPABASE_URL and CAMPUSSPHERE_SUPABASE_ANON_KEY.'); process.exit(2); }
const started = Date.now();
const response = await fetch(`${baseUrl}/rest/v1/campuses?select=id&limit=1`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
const result = { ok: response.ok || response.status === 401, status: response.status, latencyMs: Date.now() - started, checkedAt: new Date().toISOString() };
console.log(JSON.stringify(result));
if (!result.ok) process.exit(1);
