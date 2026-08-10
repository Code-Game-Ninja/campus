import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const anonKey = process.env.CAMPUSSPHERE_SUPABASE_ANON_KEY ?? '';
const token = process.env.CAMPUSSPHERE_TEST_ACCESS_TOKEN ?? '';
const concurrency = Math.max(1, Math.min(100, Number(process.argv[2] ?? 20)));
const requestsPerWorker = Math.max(1, Math.min(100, Number(process.argv[3] ?? 10)));

if (!baseUrl || !anonKey || !token) {
  console.error('Set CAMPUSSPHERE_SUPABASE_URL, CAMPUSSPHERE_SUPABASE_ANON_KEY, and CAMPUSSPHERE_TEST_ACCESS_TOKEN.');
  process.exit(2);
}
if (process.env.CAMPUSSPHERE_LOAD_TEST_ACK !== 'staging-only') {
  console.error('Refusing load test. Set CAMPUSSPHERE_LOAD_TEST_ACK=staging-only for a non-production project.');
  process.exit(2);
}

const scenarios = [
  ['feed', '/rest/v1/rpc/feed_page', { p_limit: 20 }],
  ['events', '/rest/v1/rpc/events_page', { p_limit: 20 }],
  ['teams', '/rest/v1/rpc/team_requests_page', { p_limit: 20 }],
  ['notifications', '/rest/v1/rpc/notifications_page', { p_limit: 20, p_unread_only: false }],
  ['search', '/rest/v1/rpc/search_mobile', { p_query: 'campus', p_type: 'all', p_limit: 20 }],
];

const samples = [];
async function run(worker) {
  for (let index = 0; index < requestsPerWorker; index += 1) {
    const [name, path, body] = scenarios[(worker + index) % scenarios.length];
    const started = performance.now();
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const latency = performance.now() - started;
    samples.push({ name, latency, ok: response.ok, status: response.status });
    await response.arrayBuffer();
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, worker) => run(worker)));
const sorted = samples.map((sample) => sample.latency).sort((a, b) => a - b);
const percentile = (value) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];
const failed = samples.filter((sample) => !sample.ok);
const result = {
  clients: concurrency,
  requests: samples.length,
  failed: failed.length,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
  maxMs: Math.round(sorted.at(-1) ?? 0),
  byScenario: Object.fromEntries(scenarios.map(([name]) => {
    const rows = samples.filter((sample) => sample.name === name);
    return [name, { requests: rows.length, failures: rows.filter((row) => !row.ok).length }];
  })),
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
