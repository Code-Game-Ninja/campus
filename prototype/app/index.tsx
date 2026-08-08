import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button, StateView } from '@/components/ui';
import { resolveOnboardingRoute } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

export default function Index() {
  const p = usePalette(); const hydrated = useAppStore((s) => s.hydrated); const sessionResolved = useAppStore((s) => s.sessionResolved); const sessionError = useAppStore((s) => s.sessionError); const authenticated = useAppStore((s) => s.authenticated); const onboardingRoute = useAppStore((s) => s.onboardingRoute);
  if (!hydrated || !sessionResolved) return <View style={{ flex: 1, backgroundColor: p.canvas, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={p.brand} /></View>;
  if (sessionError) return <View style={{ flex: 1, backgroundColor: p.canvas, padding: 24, justifyContent: 'center' }}><StateView icon="cloud-offline" tone="danger" title="Cannot restore your session" detail={sessionError} /><Button label="Retry" onPress={() => { useAppStore.setState({ sessionResolved: false, sessionError: null }); void resolveOnboardingRoute().then((route) => useAppStore.getState().resolveSession(route)).catch((error) => useAppStore.getState().failSessionResolution(error instanceof Error ? error.message : 'Could not restore the session.')); }} /></View>;
  if (!authenticated) return <Redirect href="/(auth)/welcome" />;
  if (onboardingRoute === 'university') return <Redirect href="/(onboarding)/university" />;
  if (onboardingRoute === 'profile') return <Redirect href="/(onboarding)/profile-setup" />;
  return <Redirect href="/(tabs)/home" />;
}
