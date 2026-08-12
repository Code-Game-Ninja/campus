import { useEffect } from 'react';
import { router, Stack, usePathname, useRootNavigationState } from 'expo-router';
import { AppProviders } from '@/providers/AppProviders';
import { getSessionRedirect, getUnderConstructionFeature } from '@/lib/navigation';
import { useAppStore } from '@/store/useAppStore';

function AppNavigator() {
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const sessionResolved = useAppStore((state) => state.sessionResolved);
  const authenticated = useAppStore((state) => state.authenticated);
  const onboardingRoute = useAppStore((state) => state.onboardingRoute);
  const sessionRedirect = getSessionRedirect(pathname, { sessionResolved, authenticated, onboardingRoute });
  const blockedFeature = getUnderConstructionFeature(pathname);

  useEffect(() => {
    if (!rootNavigationState?.key || !sessionResolved) return;

    if (sessionRedirect) {
      router.replace(sessionRedirect);
    } else if (blockedFeature) {
      router.replace({ pathname: '/under-construction', params: { feature: blockedFeature } } as never);
    }
  }, [blockedFeature, rootNavigationState?.key, sessionRedirect, sessionResolved]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="compose/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="search/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="developers/index" />
      <Stack.Screen name="under-construction" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}
