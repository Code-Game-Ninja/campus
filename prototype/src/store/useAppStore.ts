import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FeedTab, Scope, Toast } from '@/types';

/**
 * Client state is intentionally limited to UI/session concerns. Domain data
 * (posts, events, people, resources, notifications, and chat) belongs to the
 * API/query cache and must never be seeded here.
 */
export type OnboardingRoute = 'university' | 'profile' | 'complete';

type AppState = {
  hydrated: boolean;
  sessionResolved: boolean;
  sessionError: string | null;
  authenticated: boolean;
  onboardingRoute: OnboardingRoute;
  scope: Scope;
  feedTab: FeedTab;
  darkMode: boolean;
  language: string;
  toast: Toast;
  setHydrated: (value: boolean) => void;
  resolveSession: (route: OnboardingRoute | null) => void;
  failSessionResolution: (message: string) => void;
  signIn: (route?: OnboardingRoute) => void;
  signOut: () => void;
  setOnboardingRoute: (route: OnboardingRoute) => void;
  finishOnboarding: () => void;
  setScope: (scope: Scope) => void;
  setFeedTab: (tab: FeedTab) => void;
  setDarkMode: (value: boolean) => void;
  setLanguage: (value: string) => void;
  showToast: (toast: Toast) => void;
  resetDemo: () => void;
};

const initialData = (): Omit<AppState, keyof Pick<AppState,
  'setHydrated' | 'resolveSession' | 'failSessionResolution' | 'signIn' | 'signOut' | 'setOnboardingRoute' |
  'finishOnboarding' | 'setScope' | 'setFeedTab' | 'setDarkMode' |
  'setLanguage' | 'showToast' | 'resetDemo'>> => ({
  hydrated: false,
  sessionResolved: false,
  sessionError: null,
  authenticated: false,
  onboardingRoute: 'university',
  scope: 'campus',
  feedTab: 'For you',
  darkMode: false,
  language: 'English',
  toast: null,
});

const SECURE_STORE_CHUNK_BYTES = 1800;
const CHUNK_METADATA_PREFIX = 'campussphere-chunks:';
const utf8ByteLength = (value: string) => encodeURIComponent(value).replace(/%[0-9A-F]{2}|./g, 'x').length;
const splitSecureStoreValue = (value: string) => {
  const chunks: string[] = [];
  let chunk = '';
  let bytes = 0;
  for (const character of value) {
    const characterBytes = utf8ByteLength(character);
    if (chunk && bytes + characterBytes > SECURE_STORE_CHUNK_BYTES) {
      chunks.push(chunk); chunk = ''; bytes = 0;
    }
    chunk += character; bytes += characterBytes;
  }
  if (chunk || value.length === 0) chunks.push(chunk);
  return chunks;
};
const chunkCountFromMetadata = (value: string | null) => {
  if (!value?.startsWith(CHUNK_METADATA_PREFIX)) return 0;
  const count = Number(value.slice(CHUNK_METADATA_PREFIX.length));
  return Number.isInteger(count) && count > 0 ? count : 0;
};
const chunkKey = (name: string, index: number) => `${name}.chunk.${index}`;

const secureStoreStorage = {
  getItem: async (name: string) => {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(name);
    const stored = await SecureStore.getItemAsync(name);
    const count = chunkCountFromMetadata(stored);
    if (!count) return stored;
    const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(name, index))));
    return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null;
  },
  setItem: async (name: string, value: string) => {
    if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.setItem(name, value); return; }
    const previous = await SecureStore.getItemAsync(name);
    const previousCount = chunkCountFromMetadata(previous);
    const chunks = splitSecureStoreValue(value);
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(name, index), chunk)));
    await SecureStore.setItemAsync(name, `${CHUNK_METADATA_PREFIX}${chunks.length}`);
    await Promise.all(Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, index) => SecureStore.deleteItemAsync(chunkKey(name, chunks.length + index))));
  },
  removeItem: async (name: string) => {
    if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.removeItem(name); return; }
    const stored = await SecureStore.getItemAsync(name);
    const count = chunkCountFromMetadata(stored);
    await Promise.all([SecureStore.deleteItemAsync(name), ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(name, index)))]);
  },
};

export const useAppStore = create<AppState>()(persist((set) => ({
  ...initialData(),
  setHydrated: (hydrated) => set({ hydrated }),
  resolveSession: (route) => set({ sessionResolved: true, sessionError: null, authenticated: route !== null, onboardingRoute: route ?? 'university' }),
  failSessionResolution: (sessionError) => set({ sessionResolved: true, sessionError }),
  signIn: (onboardingRoute = 'university') => set({ sessionResolved: true, sessionError: null, authenticated: true, onboardingRoute }),
  signOut: () => set({ sessionResolved: true, sessionError: null, authenticated: false, onboardingRoute: 'university' }),
  setOnboardingRoute: (onboardingRoute) => set({ onboardingRoute }),
  finishOnboarding: () => set({ onboardingRoute: 'complete' }),
  setScope: (scope) => set({ scope }),
  setFeedTab: (feedTab) => set({ feedTab }),
  setDarkMode: (darkMode) => set({ darkMode }),
  setLanguage: (language) => set({ language }),
  showToast: (toast) => set({ toast }),
  resetDemo: () => set({ ...initialData(), hydrated: true }),
}), {
    name: 'campussphere-main-app-ui',
  storage: createJSONStorage(() => secureStoreStorage),
  partialize: ({ hydrated: _hydrated, sessionResolved: _sessionResolved, sessionError: _sessionError, authenticated: _authenticated, toast: _toast, ...state }) => state,
  onRehydrateStorage: () => (state) => {
    if (state) state.setHydrated(true);
    else useAppStore.setState({ hydrated: true });
  },
}));

if (useAppStore.persist.hasHydrated()) useAppStore.setState({ hydrated: true });
else useAppStore.persist.onFinishHydration(() => useAppStore.setState({ hydrated: true }));
