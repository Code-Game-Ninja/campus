import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { ToastBanner } from '@/components/ui';
import { AIPet } from '@/components/AIPet';
import { resolveOnboardingRoute } from '@/lib/auth';
import { syncPushRegistration } from '@/lib/push-notifications';
import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';

export function AppProviders({ children }: PropsWithChildren) {
  const [iconFontState, setIconFontState] = useState<'loading' | 'ready' | 'error'>('loading');
  const loadIconFont = useCallback(() => {
    setIconFontState('loading');
    void Ionicons.loadFont().then(() => setIconFontState('ready')).catch(() => setIconFontState('error'));
  }, []);
  const pathname = usePathname();
  const dark = useAppStore((s) => s.darkMode);
  const sessionCanShowAIPet = useAppStore((s) => s.sessionResolved && s.authenticated && s.onboardingRoute === 'complete');
  const inputFocusedRoute = pathname.startsWith('/settings') || pathname.startsWith('/compose') || pathname.startsWith('/search') || pathname.startsWith('/chat/');
  const showAIPet = sessionCanShowAIPet && !inputFocusedRoute;
  const toast = useAppStore((s) => s.toast);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    loadIconFont();
  }, [loadIconFont]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => showToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast, showToast]);

  useEffect(() => {
    void resolveOnboardingRoute()
      .then((route) => useAppStore.getState().resolveSession(route))
      .catch((error) => useAppStore.getState().failSessionResolution(error instanceof Error ? error.message : 'Could not restore the session.'));
  }, []);

  useEffect(() => {
    if (!sessionCanShowAIPet) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const register = async (): Promise<void> => {
      try {
        await syncPushRegistration();
      } catch {
        attempt += 1;
        if (!cancelled && attempt < 3) {
          retryTimer = setTimeout(() => void register(), attempt * 2_000);
        }
      }
    };
    void register();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [sessionCanShowAIPet]);

  if (iconFontState !== 'ready') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F8FAFC' }}>
            <Text style={{ color: '#101828', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>{iconFontState === 'loading' ? 'Loading CampusSphere…' : 'App assets could not load'}</Text>
            <Text style={{ color: '#667085', textAlign: 'center', marginTop: 10 }}>{iconFontState === 'loading' ? 'Preparing the mobile interface.' : 'Reconnect to the Expo development server, then retry.'}</Text>
            {iconFontState === 'error' ? <Pressable onPress={loadIconFont} style={{ marginTop: 18, backgroundColor: '#5146E5', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 }}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Retry</Text></Pressable> : null}
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          {children}
          <AppUpdatePrompt />
          {showAIPet ? <AIPet /> : null}
          <ToastBanner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
