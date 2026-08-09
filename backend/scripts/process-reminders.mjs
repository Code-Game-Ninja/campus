import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const serviceRoleKey = process.env.CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const batchSize = Number(process.env.CAMPUSSPHERE_REMINDER_BATCH_SIZE ?? process.argv[2] ?? 100);

if (!baseUrl || !serviceRoleKey) {
  console.error('Set CAMPUSSPHERE_SUPABASE_URL and CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
  console.error('Reminder batch size must be an integer between 1 and 500.');
  process.exit(2);
}

const response = await fetch(`${baseUrl}/rest/v1/rpc/enqueue_due_event_reminders`, {
  method: 'POST',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({ batch_size: batchSize }),
});
const text = await response.text();
let result;
try { result = text ? JSON.parse(text) : null; } catch { result = text; }
if (!response.ok) {
  console.error(`Reminder processing failed (${response.status}): ${JSON.stringify(result)}`);
  process.exit(1);
}
console.log(`Reminder processing completed. Due reminders enqueued: ${Number(result ?? 0)}.`);
