import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Button, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { signOut } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/lib/query';

export default function Security() {
  const toast = useAppStore((s) => s.showToast);
  const logout = async (scope: 'local' | 'global') => { try { await signOut(scope); queryClient.clear(); useAppStore.getState().signOut(); router.replace('/(auth)/welcome'); } catch (error) { toast({ type: 'error', message: (error as Error).message }); } };
  return <Screen><TopBar title="Security & devices" subtitle="Supabase session controls" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} /><StateView icon="shield-checkmark-outline" title="Current session is protected" detail="Supabase Auth tokens are stored in secure device storage and refreshed automatically. You can end this session or revoke every refresh token for your account." /><Button variant="secondary" label="Sign out this device" icon="log-out-outline" onPress={() => void logout('local')} /><Button variant="danger" label="Log out everywhere" icon="shield-outline" onPress={() => void logout('global')} /></Screen>;
}
