import { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Card, IconButton, Screen, SearchField, SectionHeader, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { ApiClub } from '@/lib/clubs';
import { usePalette } from '@/theme/usePalette';

export default function Clubs() {
  const p = usePalette();
  const clubsQuery = useApiQuery<ApiClub[]>(apiQueryKey('clubs'), '/communities/clubs');
  const [query, setQuery] = useState('');
  const shown = (clubsQuery.data ?? []).filter((club) => `${club.name} ${club.type}`.toLowerCase().includes(query.toLowerCase()));
  return <Screen><TopBar title="Clubs" subtitle="Communities led by campus members" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} /><SearchField value={query} onChangeText={setQuery} placeholder="Search clubs" /><SectionHeader title="Explore clubs" />{clubsQuery.isError ? <StateView icon="cloud-offline" tone="danger" title="Clubs unavailable" detail={clubsQuery.error.message} action="Retry" onAction={() => clubsQuery.refetch()} /> : clubsQuery.isLoading ? <StateView icon="hourglass-outline" title="Loading clubs" detail="Fetching campus communities…" /> : shown.length ? shown.map((club, index) => <Card key={club.id} onPress={() => router.push(`/discover/clubs/${club.id}`)} style={{ marginBottom: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}><View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: ['#E9E6FF', '#DDF7E8', '#FFF1C7'][index % 3], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="people" size={25} color="#344054" /></View><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '800' }}>{club.name}</Text>{club.verificationStatus === 'verified' ? <Ionicons name="checkmark-circle" size={16} color={p.success} /> : null}</View><Text style={{ color: p.muted, fontSize: 12, marginTop: 3 }}>{club.type} · {club.visibility}</Text><View style={{ marginTop: 7 }}><Badge label={club.verificationStatus} tone={club.verificationStatus === 'verified' ? 'success' : club.verificationStatus === 'pending' ? 'warning' : 'neutral'} /></View></View><Ionicons name="chevron-forward" size={20} color={p.muted} /></View></Card>) : <StateView icon="people-outline" title="No clubs found" detail="Try another name or browse all clubs." action="Clear search" onAction={() => setQuery('')} />}</Screen>;
}
