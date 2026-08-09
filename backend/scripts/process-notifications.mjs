import process from 'node:process';

const baseUrl = (process.env.CAMPUSSPHERE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = process.env.CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const resendKey = process.env.RESEND_API_KEY ?? '';
const emailFrom = process.env.CAMPUSSPHERE_EMAIL_FROM ?? '';
const batchSize = Number(process.env.CAMPUSSPHERE_NOTIFICATION_BATCH_SIZE ?? process.argv[2] ?? 50);
const workerId = `notification-${process.pid}`;

if (!baseUrl || !key) { console.error('Set CAMPUSSPHERE_SUPABASE_URL and CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY.'); process.exit(2); }
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 200) { console.error('Notification batch size must be between 1 and 200.'); process.exit(2); }

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.headers ?? {}) } });
  const text = await response.text(); let result; try { result = text ? JSON.parse(text) : null; } catch { result = text; }
  if (!response.ok) throw new Error(`HTTP ${response.status} ${path}: ${JSON.stringify(result)}`);
  return result;
}
const rpc = (name, body) => request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });

async function complete(id, delivered, error = null, retry = 60) {
  await rpc('complete_notification_delivery', { outbox_id: id, delivered, error_message: error, retry_after_seconds: retry });
}

async function deliverEmail(notification) {
  if (!resendKey || !emailFrom) throw new Error('email provider not configured');
  const users = await request(`/rest/v1/users?id=eq.${encodeURIComponent(notification.user_id)}&select=email&limit=1`);
  const email = users?.[0]?.email;
  if (!email) throw new Error('recipient email unavailable');
  const title = notification.payload?.title ?? notification.type.replaceAll('_', ' ');
  const body = notification.payload?.body ?? `CampusSphere update: ${title}`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: emailFrom, to: [email], subject: title, text: body }) });
  if (!response.ok) throw new Error(`email delivery HTTP ${response.status}: ${await response.text()}`);
}

async function deliverPush(notification) {
  const devices = await request(`/rest/v1/user_devices?user_id=eq.${encodeURIComponent(notification.user_id)}&disabled_at=is.null&push_token=not.is.null&select=id,push_token`);
  if (!devices.length) throw new Error('no active push devices');
  const title = notification.payload?.title ?? 'CampusSphere';
  const body = notification.payload?.body ?? notification.type.replaceAll('_', ' ');
  const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(devices.map((device) => ({ to: device.push_token, title, body, data: { type: notification.type, subjectType: notification.subject_type, subjectId: notification.subject_id } }))) });
  if (!response.ok) throw new Error(`push delivery HTTP ${response.status}: ${await response.text()}`);
  const result = await response.json();
  const tickets = Array.isArray(result?.data) ? result.data : [];
  for (let index = 0; index < tickets.length; index += 1) {
    if (tickets[index]?.status === 'error' && tickets[index]?.details?.error === 'DeviceNotRegistered') {
      await request(`/rest/v1/user_devices?id=eq.${encodeURIComponent(devices[index].id)}`, { method: 'PATCH', body: JSON.stringify({ disabled_at: new Date().toISOString() }) });
    }
  }
  if (tickets.some((ticket) => ticket?.status === 'error' && ticket?.details?.error !== 'DeviceNotRegistered')) throw new Error('push provider returned delivery errors');
}

try {
  const claimed = await rpc('claim_notification_outbox', { worker_id: workerId, batch_size: batchSize });
  let sent = 0; let failed = 0;
  for (const item of Array.isArray(claimed) ? claimed : []) {
    try {
      const notifications = await request(`/rest/v1/notifications?id=eq.${encodeURIComponent(item.notification_id)}&select=*&limit=1`);
      const notification = notifications[0];
      if (!notification) throw new Error('notification missing');
      if (item.channel === 'email') await deliverEmail(notification);
      else if (item.channel === 'push') await deliverPush(notification);
      else throw new Error(`unsupported delivery channel ${item.channel}`);
      await complete(item.id, true); sent += 1;
    } catch (error) {
      await complete(item.id, false, error instanceof Error ? error.message : String(error), 300); failed += 1;
    }
  }
  console.log(JSON.stringify({ claimed: Array.isArray(claimed) ? claimed.length : 0, sent, failed }));
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
