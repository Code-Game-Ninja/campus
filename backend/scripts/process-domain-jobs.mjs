import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = process.env.CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const batchSize = Number(process.env.CAMPUSSPHERE_JOB_BATCH_SIZE ?? process.argv[2] ?? 100);
if (!baseUrl || !key) { console.error('Set CAMPUSSPHERE_SUPABASE_URL and CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY.'); process.exit(2); }
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) { console.error('Job batch size must be between 1 and 500.'); process.exit(2); }

async function rpc(name, body) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text();
  let result; try { result = text ? JSON.parse(text) : null; } catch { result = text; }
  if (!response.ok) throw new Error(`${name} failed (${response.status}): ${JSON.stringify(result)}`);
  return result;
}

try {
  const expired = await rpc('expire_team_requests', { p_batch_size: batchSize });
  const retention = await rpc('cleanup_retention', {});
  const deletions = await rpc('claim_account_deletions', { p_worker_id: `domain-${process.pid}`, p_batch_size: Math.min(batchSize, 100) });
  let deletedAccounts = 0;
  for (const job of Array.isArray(deletions) ? deletions : []) {
    const response = await fetch(`${baseUrl}/auth/v1/admin/users/${job.user_id}`, {
      method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (response.ok || response.status === 404) {
      deletedAccounts += 1;
    } else {
      const errorText = await response.text();
      await rpc('fail_account_deletion', { p_user_id: job.user_id, p_error: `Auth delete HTTP ${response.status}: ${errorText}` });
    }
  }
  console.log(JSON.stringify({ expiredTeamRequests: Number(expired ?? 0), retention, claimedDeletionJobs: Array.isArray(deletions) ? deletions.length : 0, deletedAccounts }));
} catch (error) {
  console.error(error instanceof Error ? error.message : error); process.exit(1);
}
