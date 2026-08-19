import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { registerUnauthorizedHandler, setAccessToken } from './api';
import { claimDeviceForSession } from './device-security';
import { SupabaseHttpError, supabaseRequest } from './supabase-http';
import type { OnboardingRoute } from '@/store/useAppStore';

const SESSION_KEY = 'campussphere.supabase.session';
const REMEMBERED_ACCOUNT_KEY = 'campussphere.remembered-account';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: { id: string; email?: string };
}

async function save(session: AuthSession | null): Promise<void> {
  setAccessToken(session?.access_token ?? null);
  const value = session ? JSON.stringify(session) : null;
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (value) localStorage.setItem(SESSION_KEY, value);
    else localStorage.removeItem(SESSION_KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(SESSION_KEY, value);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function load(): Promise<AuthSession | null> {
  const raw = Platform.OS === 'web'
    ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(SESSION_KEY))
    : await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    return session.access_token && session.refresh_token ? session : null;
  } catch {
    return null;
  }
}

export async function getRememberedAccount(): Promise<{ email: string; userId?: string } | null> {
  const raw = Platform.OS === 'web'
    ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(REMEMBERED_ACCOUNT_KEY))
    : await SecureStore.getItemAsync(REMEMBERED_ACCOUNT_KEY);
  if (!raw) return null;
  try { const value = JSON.parse(raw); return value?.email ? { email: String(value.email), userId: value.userId ? String(value.userId) : undefined } : null; } catch { return null; }
}

async function rememberAccount(session: AuthSession, email = session.user?.email) {
  if (!email) return;
  const value = JSON.stringify({ email: email.trim().toLowerCase(), userId: session.user?.id });
  if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.setItem(REMEMBERED_ACCOUNT_KEY, value); return; }
  await SecureStore.setItemAsync(REMEMBERED_ACCOUNT_KEY, value);
}

function normalizeSession(session: AuthSession): AuthSession {
  if (!session.expires_at && session.expires_in) {
    session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  }
  return session;
}

export async function sendOtp(email: string): Promise<void> {
  await supabaseRequest('auth', 'otp', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), create_user: true },
  });
}

export async function verifyOtp(email: string, token: string): Promise<AuthSession> {
  const session = normalizeSession(await supabaseRequest<AuthSession>('auth', 'verify', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), token: token.trim(), type: 'email' },
  }));
  if (!session.access_token || !session.refresh_token) throw new Error('Supabase did not return a valid session.');
  await save(session);
  try { await claimDeviceForSession(session); await rememberAccount(session, email); } catch (error) { await save(null); throw error; }
  return session;
}

async function refreshSession(session: AuthSession): Promise<AuthSession | null> {
  try {
    const refreshed = normalizeSession(await supabaseRequest<AuthSession>('auth', 'token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refresh_token },
    }));
    await save(refreshed);
    try { await claimDeviceForSession(refreshed); await rememberAccount(refreshed); } catch (error) { await save(null); throw error; }
    return refreshed;
  } catch (error) {
    if (error instanceof SupabaseHttpError && [400, 401, 403].includes(error.status)) {
      await save(null);
      return null;
    }
    throw error;
  }
}

export async function restoreSession(forceRefresh = false): Promise<AuthSession | null> {
  const existing = await load();
  if (!existing) {
    setAccessToken(null);
    return null;
  }
  const expiresSoon = !existing.expires_at || existing.expires_at <= Math.floor(Date.now() / 1000) + 60;
  if (forceRefresh || expiresSoon) return refreshSession(existing);
  setAccessToken(existing.access_token);
  try { await claimDeviceForSession(existing); await rememberAccount(existing); } catch (error) { await save(null); throw error; }
  return existing;
}

export async function resolveOnboardingRoute(): Promise<OnboardingRoute | null> {
  const session = await restoreSession();
  if (!session) return null;
  const rows = await supabaseRequest<Array<{
    id: string;
    campus_id: string | null;
    onboarding_completed_at: string | null;
  }>>('rest', 'users?select=id,campus_id,onboarding_completed_at&limit=1', { accessToken: session.access_token });
  const identity = rows[0];
  if (!identity?.campus_id) return 'university';
  if (identity.onboarding_completed_at) return 'complete';

  // Older accounts can have a completed profile from before the onboarding
  // completion timestamp was introduced. Recover those sessions instead of
  // forcing users through campus and profile setup again.
  const profiles = await supabaseRequest<Array<{ user_id: string }>>(
    'rest',
    `profiles?select=user_id&user_id=eq.${encodeURIComponent(identity.id)}&limit=1`,
    { accessToken: session.access_token },
  );
  return profiles.length > 0 ? 'complete' : 'profile';
}

export async function bootstrapIdentity(campusId: string): Promise<{ userId: string; campusId: string; created: boolean }> {
  const session = await restoreSession();
  if (!session?.user?.id) throw new Error('Authentication is required.');
  return supabaseRequest('rest', 'rpc/bootstrap_mobile_identity', {
    method: 'POST',
    accessToken: session.access_token,
    body: { target_campus_id: campusId },
  });
}

export async function signOut(scope: 'local' | 'global' = 'local'): Promise<void> {
  const session = await load();
  if (session?.access_token) {
    try {
      await supabaseRequest('auth', `logout?scope=${scope}`, { method: 'POST', accessToken: session.access_token });
    } catch {
      // Local sign-out must still succeed when the remote session already expired.
    }
  }
  await save(null);
}

registerUnauthorizedHandler(async () => Boolean(await restoreSession(true)));
