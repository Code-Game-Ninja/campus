import { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Button, Card, IconButton, Screen, SearchField, SectionHeader, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { mapResource, type ApiResource } from '@/lib/resources';
import { usePalette } from '@/theme/usePalette';

interface ResourcePage { items: ApiResource[]; nextCursor: string | null }
export default function Notes() {
  const p = usePalette();
  const resourcesQuery = useApiQuery<ResourcePage>(apiQueryKey('resources', 'servable'), '/resources', { limit: 100 });
  const [query, setQuery] = useState('');
  const resources = (resourcesQuery.data?.items ?? []).map(mapResource);
  const shown = resources.filter((item) => `${item.title} ${item.subject} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  return <Screen><TopBar title="Notes hub" subtitle="Campus study files" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} right={<Button compact label="Share" icon="cloud-upload-outline" onPress={() => router.push('/discover/notes/upload')} />} /><SearchField value={query} onChangeText={setQuery} placeholder="Search notes" /><SectionHeader title="Materials" />{resourcesQuery.isError ? <StateView icon="cloud-offline" tone="danger" title="Notes unavailable" detail={resourcesQuery.error.message} action="Retry" onAction={() => resourcesQuery.refetch()} /> : resourcesQuery.isLoading ? <StateView icon="hourglass-outline" title="Loading notes" detail="Fetching available resources…" /> : shown.length ? shown.map((resource) => <Card key={resource.id} onPress={() => router.push(`/discover/notes/${resource.id}`)} style={{ marginBottom: 12 }}><View style={{ flexDirection: 'row', gap: 13 }}><View style={{ width: 58, height: 72, borderRadius: 12, backgroundColor: resource.accent, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="document-text" size={27} color="#344054" /></View><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 16, lineHeight: 21, fontWeight: '800' }}>{resource.title}</Text><Text style={{ color: p.muted, fontSize: 12, marginTop: 5 }}>{resource.department} · {resource.subject} · {resource.sourceType.toUpperCase()}</Text><View style={{ marginTop: 9 }}><Badge label="Available" tone="success" icon="checkmark-circle" /></View></View></View></Card>) : <StateView icon="document-text-outline" title="No materials found" detail={query ? 'Try a different title or subject.' : 'No campus resources are available yet.'} action="Share material" onAction={() => router.push('/discover/notes/upload')} />}</Screen>;
}
