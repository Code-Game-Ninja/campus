import { config, assertConfig } from './config.mjs';
import { HttpError } from './errors.mjs';

function parseBody(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function errorMessage(payload, status) {
  if (payload && typeof payload === 'object') return payload.message || payload.msg || payload.error_description || payload.error || `Supabase request failed (${status}).`;
  return typeof payload === 'string' ? payload : `Supabase request failed (${status}).`;
}

export async function supabaseRequest(kind, endpoint, { method = 'GET', body, token, admin = false, headers = {}, count = false } = {}) {
  assertConfig();
  const prefix = kind === 'auth' ? '/auth/v1' : '/rest/v1';
  const key = admin ? config.serviceRoleKey : config.anonKey;
  let response;
  try {
    response = await fetch(`${config.supabaseUrl}${prefix}/${endpoint.replace(/^\/+/, '')}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${token || key}`,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(count ? { Prefer: 'count=exact' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new HttpError(503, 'The Supabase project is currently unreachable.', 'SUPABASE_UNAVAILABLE', error instanceof Error ? error.message : undefined);
  }
  const payload = parseBody(await response.text());
  if (!response.ok) throw new HttpError(response.status, errorMessage(payload, response.status), payload?.code || 'SUPABASE_ERROR', payload?.details || payload?.hint);
  const range = response.headers.get('content-range');
  const parsedCount = range && range.includes('/') && range.split('/')[1] !== '*' ? Number(range.split('/')[1]) : null;
  return { data: payload, count: Number.isFinite(parsedCount) ? parsedCount : null, headers: response.headers };
}

export async function restSelect(table, params = {}, options = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  return supabaseRequest('rest', `${table}?${query.toString()}`, { ...options, count: options.count === true });
}

export async function restRpc(name, body = {}, options = {}) {
  return supabaseRequest('rest', `rpc/${name}`, { method: 'POST', body, ...options });
}
