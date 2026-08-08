import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, IconButton, Screen, SectionHeader, StateView, TopBar } from '@/components/ui';
import { useApiQuery } from '@/lib/api-hooks';
import { apiQueryKey } from '@/lib/api-hooks';
import { usePalette } from '@/theme/usePalette';

export interface OpportunityView { id: string; scope: 'campus' | 'global'; title: string; provider: string | null; category: string | null; deadline: string | null; sourceUrl: string; eligibility: string | null; state: 'pending' | 'verified' | 'expired' | 'flagged'; version: number; createdAt: string }

export default function Opportunities() {
  const p = usePalette();
  const query = useApiQuery<OpportunityView[]>(apiQueryKey('opportunities'), '/opportunities', { limit: 30 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const items = (query.data ?? []).filter((item) => item.state === 'verified');
  return <Screen><TopBar title="Opportunities" subtitle="Curated and source-verified" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} /><SectionHeader title="Open now" />
    {query.isError ? <StateView icon="cloud-offline" tone="danger" title="Opportunities unavailable" detail={query.error.message} action="Retry" onAction={() => query.refetch()} /> : query.isLoading ? <StateView icon="hourglass-outline" title="Loading opportunities" detail="Fetching verified listings…" /> : items.length === 0 ? <StateView icon="briefcase-outline" title="No verified opportunities" detail="New listings appear after moderation review." /> : items.map((item, i) => {
      const deadline = item.deadline ? new Date(item.deadline) : null;
      const expired = deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < now;
      return <Card key={item.id} style={{ marginBottom: 12 }}><View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: ['#FFF1C7','#DCE7FF','#DDF7E8'][i % 3], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="briefcase" size={23} color="#344054" /></View><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>{item.category ? <Badge label={item.category} /> : null}<Badge label="Verified source" tone="success" icon="checkmark-circle" /></View><Text style={{ color: p.ink, fontSize: 18, lineHeight: 24, fontWeight: '900', marginTop: 10 }}>{item.title}</Text><Body muted style={{ marginTop: 4 }}>{item.provider ?? 'CampusSphere'} · {expired ? 'Deadline passed' : `Deadline ${item.deadline ? new Date(item.deadline).toLocaleDateString() : 'Open'}`}</Body>{item.eligibility ? <Body style={{ marginTop: 10 }}>{item.eligibility}</Body> : null}<View style={{ marginTop: 14 }}><Button compact variant="ghost" label="Open verified source" icon="open-outline" onPress={() => void Linking.openURL(item.sourceUrl)} /></View></Card>;
    })}
  </Screen>;
}
