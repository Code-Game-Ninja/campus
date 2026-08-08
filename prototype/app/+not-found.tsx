import { router } from 'expo-router';
import { Screen, StateView } from '@/components/ui';
export default function NotFound() { return <Screen scroll={false}><StateView icon="compass-outline" title="This path isn't available" detail="The link may be old, private, or outside your current campus scope." action="Return home" onAction={() => router.replace('/(tabs)/home')} /></Screen>; }
