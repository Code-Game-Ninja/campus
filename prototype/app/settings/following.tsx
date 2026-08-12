import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Card, Body, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { FollowView } from '@/lib/follows';

export default function Following() {
  const follows = useApiQuery<FollowView[]>(apiQueryKey('follows', 'People'), '/follows', { type: 'people' });
  return <Screen><TopBar title="Following" subtitle="People you follow" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} />{follows.isLoading ? <StateView icon="hourglass-outline" title="Loading follows" detail="Reading your server-side follow graph…" /> : follows.isError ? <StateView icon="cloud-offline" tone="danger" title="Following unavailable" detail={follows.error.message} action="Retry" onAction={() => void follows.refetch()} /> : follows.data?.length ? follows.data.map((item) => <Card key={`${item.targetType}-${item.targetId}`} style={{ marginTop: 10 }}><Body>{item.displayName}</Body><Body muted style={{ marginTop: 4 }}>Following since {new Date(item.followedAt).toLocaleDateString()}</Body></Card>) : <StateView icon="person-add-outline" title="No people followed yet" detail="Follow discoverable people from their profile." action="Open Discover" onAction={() => router.push('/(tabs)/discover')} />}</Screen>;
}
