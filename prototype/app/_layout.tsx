import { useEffect } from 'react';
import { router, Stack, usePathname } from 'expo-router';
import { AppProviders } from '@/providers/AppProviders';
import { getUnderConstructionFeature } from '@/lib/navigation';

function AppNavigator() {
  const pathname = usePathname();
  const blockedFeature = getUnderConstructionFeature(pathname);

  useEffect(() => {
    if (blockedFeature) {
      router.replace({ pathname: '/under-construction', params: { feature: blockedFeature } } as never);
    }
  }, [blockedFeature]);

  // Do not mount blocked route components while redirect is pending. Some of
  // those screens start API queries/effects on mount.
  if (blockedFeature) return null;

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
