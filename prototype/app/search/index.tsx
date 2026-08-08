import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Body, Card, Chip, IconButton, Screen, SearchField, Segmented, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { usePalette } from '@/theme/usePalette';

type Filter = 'All' | 'People' | 'Notes' | 'Posts';
type SearchScope = 'Campus' | 'Global';
interface SearchHit { id: string; docType: string; title: string; scope: 'campus' | 'global'; score: number; excerpt?: string; updatedAt?: string }
interface SearchResult { hits: SearchHit[]; degraded: boolean; requestId?: string; fallback?: 'browse_by_category' }

const filters: readonly Filter[] = ['All', 'People', 'Notes', 'Posts'];
const docTypes: Record<Exclude<Filter, 'All'>, string> = { People: 'person', Notes: 'resource', Posts: 'post' };
const enabledTypes = new Set(['person', 'resource', 'post']);
const scopes: readonly SearchScope[] = ['Campus', 'Global'];

function resultPath(hit: SearchHit): string {
  if (hit.docType === 'person') return `/people/${hit.id}`;
  if (hit.docType === 'event') return `/discover/events/${hit.id}`;
  if (hit.docType === 'resource') return `/discover/notes/${hit.id}`;
  if (hit.docType === 'club') return `/discover/clubs/${hit.id}`;
  if (hit.docType === 'listing') return `/discover/listings/${hit.id}`;
  if (hit.docType === 'post') return `/post/${hit.id}`;
  if (hit.docType === 'opportunity') return '/discover/opportunities';
  return '/(tabs)/discover';
}

function resultIcon(docType: string): keyof typeof Ionicons.glyphMap {
  if (docType === 'person') return 'person-outline';
  if (docType === 'event') return 'calendar-outline';
  if (docType === 'resource') return 'document-text-outline';
  if (docType === 'listing') return 'pricetag-outline';
  if (docType === 'club') return 'people-outline';
  return 'search-outline';
}

export default function Search() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const p = usePalette();
  const [query, setQuery] = useState(q ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(q ?? '');
  const [filter, setFilter] = useState<Filter>('All');
  const [scope, setScope] = useState<SearchScope>('Campus');
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250); return () => clearTimeout(timer); }, [query]);
  const type = scope === 'Global' ? 'person' : filter === 'All' ? undefined : docTypes[filter];
  const apiScope = scope.toLowerCase() as 'campus' | 'global';
  const search = useApiQuery<SearchResult>(apiQueryKey('search', apiScope, debouncedQuery, type ?? 'all'), '/search', { q: debouncedQuery, type, scope: apiScope, limit: 40 }, {
    enabled: debouncedQuery.length === 0 || debouncedQuery.length >= 2,
    staleTime: 10_000,
    placeholderData: (previous) => previous,
  });
  const result = search.data;
  const hits = (result?.hits ?? []).filter((hit) => enabledTypes.has(hit.docType));
  const openResult = (hit: SearchHit) => {
    if (hit.docType === 'person') {
      router.push({ pathname: '/people/[id]', params: { id: hit.id, scope: hit.scope } } as never);
      return;
    }
    router.push(resultPath(hit) as never);
  };

  return <Screen>
    <TopBar title="Search" left={<IconButton icon="close" label="Close search" onPress={() => goBackOrReplace('/(tabs)/home')} />} right={<Ionicons name={result?.degraded ? 'cloud-offline' : 'cloud-outline'} size={21} color={result?.degraded ? p.warning : p.muted} />} />
    <View style={{ marginBottom: 12 }}><Segmented values={scopes} value={scope} onChange={(next) => { setScope(next); if (next === 'Global') setFilter('People'); }} /></View>
    <SearchField value={query} onChangeText={setQuery} placeholder={scope === 'Global' ? 'Search anyone by name, username, or email' : 'Search by name, username, email, posts and more'} />
    {scope === 'Campus' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>{filters.map((item) => <Chip key={item} label={item} selected={filter === item} onPress={() => setFilter(item)} />)}</View> : <Body muted style={{ marginTop: 12 }}>Global search shows active, discoverable people across CampusSphere.</Body>}
    {debouncedQuery.length === 1 ? <StateView icon="search-outline" title="Keep typing" detail="Enter at least two characters to search." /> : search.isError ? <View style={{ marginTop: 18 }}><StateView icon="cloud-offline" title="Search unavailable" detail={search.error.message} action="Retry" onAction={() => search.refetch()} tone="danger" /></View> : search.isLoading && !result ? <StateView icon="hourglass-outline" title="Searching" detail={scope === 'Global' ? 'Checking discoverable people across CampusSphere…' : 'Checking authorized campus results…'} /> : result?.degraded ? <View style={{ marginTop: 18 }}><StateView icon="compass-outline" title="Search is temporarily unavailable" detail={`Browse-by-category remains available.${result.requestId ? ` Support ID: ${result.requestId}` : ''}`} action="Browse Discover" onAction={() => router.replace('/(tabs)/discover')} tone="warning" /></View> : <>
      <Body muted style={{ marginTop: 18 }}>{hits.length} result{hits.length === 1 ? '' : 's'}{debouncedQuery ? ` for “${debouncedQuery}”` : ''}</Body>
      <View style={{ gap: 10, marginTop: 12 }}>{hits.map((hit) => <Card key={`${hit.docType}-${hit.id}`} onPress={() => openResult(hit)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={resultIcon(hit.docType)} size={21} color={p.brand} /></View>
        <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Badge label={hit.docType} tone="brand" /><Badge label={hit.scope === 'global' ? 'Global' : 'Campus'} /></View><Text style={{ color: p.ink, fontSize: 16, fontWeight: '800', marginTop: 7 }}>{hit.title}</Text>{hit.excerpt ? <Text numberOfLines={2} style={{ color: p.muted, fontSize: 13, lineHeight: 19, marginTop: 3 }}>{hit.excerpt}</Text> : null}</View>
        <Ionicons name="chevron-forward" size={18} color={p.muted} />
      </Card>)}</View>
      {result && hits.length === 0 ? <StateView icon="search-outline" title="No matching results" detail={scope === 'Global' || filter === 'People' ? 'Only active, discoverable, unblocked profiles can appear.' : 'Try different words or browse live categories in Discover.'} action="Browse categories" onAction={() => router.replace('/(tabs)/discover')} /> : null}
    </>}
  </Screen>;
}
