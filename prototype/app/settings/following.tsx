import { useState } from 'react';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Card, Body, IconButton, Screen, Segmented, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { FollowView } from '@/lib/follows';

type Tab = 'People' | 'Clubs';
export default function Following() {
  const [tab, setTab] = useState<Tab>('People');
  const follows = useApiQuery<FollowView[]>(apiQueryKey('follows', tab), '/follows', { type: tab === 'People' ? 'people' : 'clubs' });
  return <Screen><TopBar title="Following" subtitle="Server-backed relationships" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} /><Segmented values={['People', 'Clubs'] as const} value={tab} onChange={setTab} />{follows.isLoading ? <StateView icon="hourglass-outline" title="Loading follows" detail="Reading your server-side follow graph…" /> : follows.isError ? <StateView icon="cloud-offline" tone="danger" title="Following unavailable" detail={follows.error.message} action="Retry" onAction={() => void follows.refetch()} /> : follows.data?.length ? follows.data.map((item) => <Card key={`${item.targetType}-${item.targetId}`} style={{ marginTop: 10 }}><Body>{item.displayName}</Body><Body muted style={{ marginTop: 4 }}>Following since {new Date(item.followedAt).toLocaleDateString()}</Body></Card>) : <StateView icon={tab === 'People' ? 'person-add-outline' : 'people-outline'} title={`No ${tab.toLowerCase()} followed yet`} detail="Follow people or clubs from their profile." action="Open Discover" onAction={() => router.push('/(tabs)/discover')} />}</Screen>;
}
