import type { Metric, Role, Tone } from '../data';

const API_URL = (import.meta.env.VITE_ADMIN_API_URL || (import.meta.env.DEV ? 'http://localhost:4180' : window.location.origin)).replace(/\/+$/, '');
const SESSION_KEY = 'campussphere.admin.session';

export type AdminSession = { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user?: { id: string; email?: string } };
export type AdminContext = { user: { id: string; email: string; displayName: string; avatarKey: string | null }; role: Role; campusId: string | null; organizerId: string | null; campus: { id: string; name: string; slug: string; status: string; timezone: string } | null };
export type DashboardData = { metrics: Metric[]; trend: number[]; health: { value: number; unreadNotifications: number; status: string }; activity: Array<{ time: string; title: string; detail: string; actor: string; tone: Tone }> };
export type TableData = { records: Array<Record<string, unknown>>; total: number; columns: string[]; rows: string[][] };
export type NotificationRecord = { id: string; type: string; title: string; detail: string; unread: boolean; created_at: string };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'REQUEST_FAILED') { super(message); this.name = 'ApiError'; }
}

function storedSession(): AdminSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as AdminSession | null; } catch { return null; }
}

function storeSession(session: AdminSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function normalizeSession(session: AdminSession): AdminSession {
  if (!session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  return session;
}

async function parse(response: Response) {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

async function fetchApi<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  let session = storedSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...options.headers },
  });
  const payload = await parse(response);
  if (response.status === 401 && retry && session?.refresh_token) {
    try {
      const refreshed = await fetch(`${API_URL}/v1/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: session.refresh_token }) });
      if (refreshed.ok) { session = normalizeSession(await refreshed.json()); storeSession(session); return fetchApi<T>(path, options, false); }
    } catch { /* fall through to sign-out */ }
    storeSession(null);
  }
  if (!response.ok) throw new ApiError(payload?.error?.message || `Request failed (${response.status}).`, response.status, payload?.error?.code);
  return payload as T;
}

export function hasSession() { return Boolean(storedSession()?.access_token); }
export async function sendOtp(email: string) { return fetchApi<{ sent: boolean }>('/v1/auth/otp', { method: 'POST', body: JSON.stringify({ email }) }, false); }
export async function verifyOtp(email: string, code: string) { const session = normalizeSession(await fetchApi<AdminSession>('/v1/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) }, false)); storeSession(session); return session; }
export async function signOut() { try { await fetchApi('/v1/auth/logout', { method: 'POST' }, false); } finally { storeSession(null); } }
export const apiGet = <T>(path: string) => fetchApi<T>(path);
export const apiPost = <T>(path: string, body: unknown = {}) => fetchApi<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => fetchApi<T>(path, { method: 'DELETE' });

export function tableEndpoint(section: string) {
  if (section === 'Events' || section === 'Venues & Media') return '/v1/events';
  if (section === 'Registrations') return '/v1/registrations';
  if (section === 'Posts' || section === 'All Content') return '/v1/posts';
  if (section === 'Moderation') return '/v1/moderation';
  if (section === 'Event Managers' || section === 'Staff & Roles') return '/v1/staff';
  if (section === 'Campuses') return '/v1/campuses';
  if (section === 'Users') return '/v1/users';
  if (section === 'Audit Log') return '/v1/audit';
  return null;
}
