import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { setAccessToken, registerUnauthorizedHandler } from './api';
import type { OnboardingRoute } from '@/store/useAppStore';

const SESSION_KEY = 'campussphere.mock.session';

export interface AuthSession { access_token: string; refresh_token: string; expires_at?: number; user?: { id: string; email?: string } }

async function save(session: AuthSession | null): Promise<void> {
  setAccessToken(session?.access_token ?? null);
  const value = session ? JSON.stringify(session) : null;
  if (Platform.OS === 'web') {
    if (value) localStorage.setItem(SESSION_KEY, value);
    else localStorage.removeItem(SESSION_KEY);
    return;
  }
  if (value) {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

async function load(): Promise<AuthSession | null> {
  const raw = Platform.OS === 'web'
    ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(SESSION_KEY))
    : await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; } catch { return null; }
}

export async function sendOtp(email: string): Promise<void> { 
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
}

export async function verifyOtp(email: string, token: string): Promise<AuthSession> { 
  const session: AuthSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    user: { id: 'u_123', email }
  };
  await save(session);
  return session; 
}

export async function restoreSession(forceRefresh = false): Promise<AuthSession | null> { 
  const existing = await load(); 
  if (!existing) return null; 
  setAccessToken(existing.access_token); 
  return existing; 
}

export async function resolveOnboardingRoute(): Promise<OnboardingRoute | null> {
  const session = await restoreSession();
  if (!session) return null;
  
  // Hardcoded to return 'complete' for the prototype, bypassing onboarding logic
  return 'complete';
}

export async function bootstrapIdentity(universityId: string): Promise<{ userId: string; campusId: string; created: boolean }> { 
  return { userId: 'u_123', campusId: 'c_1', created: true }; 
}

export async function signOut(): Promise<void> {
  await save(null);
}

registerUnauthorizedHandler(async () => Boolean(await restoreSession(true)));
