import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { EventCard } from '@/components/cards';
import { Chip, IconButton, Screen, SearchField, SectionHeader, StateView, TopBar } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';
import { useApiQuery } from '@/lib/api-hooks';
import { apiQueryKey } from '@/lib/api-hooks';
import { mapEvent, type ApiEvent } from '@/lib/events';

const filters = ['All', 'Technology', 'Culture', 'Music'] as const;
export default function Events() { const p = usePalette(); const eventsQuery = useApiQuery<ApiEvent[]>(apiQueryKey('events', 'published'), '/events', { status: 'published' }); const [query, setQuery] = useState(''); const [filter, setFilter] = useState<(typeof filters)[number]>('All'); const events = (eventsQuery.data ?? []).map(mapEvent); const shown = events.filter((x) => (filter === 'All' || x.category.toLowerCase() === filter.toLowerCase()) && x.title.toLowerCase().includes(query.toLowerCase())); return <Screen><TopBar title="Events" subtitle="Dates and times shown in your local timezone" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} /><SearchField value={query} onChangeText={setQuery} placeholder="Search events" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{filters.map((x) => <Chip key={x} label={x} selected={filter === x} onPress={() => setFilter(x)} />)}</View><SectionHeader title="Upcoming" />{eventsQuery.isError ? <StateView icon="cloud-offline" tone="danger" title="Events unavailable" detail={eventsQuery.error.message} action="Retry" onAction={() => eventsQuery.refetch()} /> : eventsQuery.isLoading ? <StateView icon="hourglass-outline" title="Loading events" detail="Fetching published campus events…" /> : shown.length ? shown.map((event) => <EventCard key={event.id} event={event} />) : <StateView icon="calendar-outline" title="No events match" detail="Try another category or clear your search." action="Clear filters" onAction={() => { setFilter('All'); setQuery(''); }} />}</Screen>; }
