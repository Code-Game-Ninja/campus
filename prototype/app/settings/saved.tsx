import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { EventCard, PostCard } from '@/components/cards';
import { Badge, Card, Chip, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { mapEvent, type ApiEvent } from '@/lib/events';
import { mapPost, type FeedPage } from '@/lib/feed';
import { mapResource, type ApiResource } from '@/lib/resources';
import { usePalette } from '@/theme/usePalette';

type Tab = 'Posts' | 'Events' | 'Notes';
interface BookmarkRow { target_type: string; target_id: string }

export default function Saved() {
  const p = usePalette();
  const [tab, setTab] = useState<Tab>('Posts');
  const me = useApiQuery<{ campusId: string }>(apiQueryKey('me'), '/me', {}, { staleTime: 300_000 });
  const bookmarks = useApiQuery<BookmarkRow[]>(apiQueryKey('bookmarks'), '/bookmarks');
  const feed = useApiQuery<FeedPage>(apiQueryKey('saved-post-candidates'), '/posts', { limit: 100 });
  const events = useApiQuery<ApiEvent[]>(apiQueryKey('saved-event-candidates'), '/events', { status: 'published', limit: 100 });
  const resources = useApiQuery<{ items: ApiResource[] }>(apiQueryKey('saved-resource-candidates'), '/resources', { limit: 100 });
  const ids = (type: string) => new Set((bookmarks.data ?? []).filter((item) => item.target_type === type).map((item) => item.target_id));
  const savedPostIds = useMemo(() => ids('post'), [bookmarks.data]);
  const savedEventIds = useMemo(() => ids('event'), [bookmarks.data]);
  const savedResourceIds = useMemo(() => ids('resource'), [bookmarks.data]);
  const posts = useMemo(() => (feed.data?.items ?? []).filter((post) => savedPostIds.has(post.id)).map((post) => mapPost(post, me.data?.campusId ?? 'My campus')), [feed.data?.items, me.data?.campusId, savedPostIds]);
  const savedEvents = useMemo(() => (events.data ?? []).filter((event) => savedEventIds.has(event.id)).map(mapEvent), [events.data, savedEventIds]);
  const notes = useMemo(() => (resources.data?.items ?? []).filter((item) => savedResourceIds.has(item.id)).map(mapResource), [resources.data?.items, savedResourceIds]);
  const active = tab === 'Posts' ? [feed, me] : tab === 'Events' ? [events] : [resources];
  const error = bookmarks.error ?? active.find((query) => query.error)?.error;
  const loading = bookmarks.isLoading || active.some((query) => query.isLoading);
  const retry = () => { void bookmarks.refetch(); active.forEach((query) => void query.refetch()); };

  return <Screen><TopBar title="Saved items" subtitle="Private server-backed bookmarks" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} /><View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}><Chip label="Posts" selected={tab === 'Posts'} onPress={() => setTab('Posts')} /><Chip label="Events" selected={tab === 'Events'} onPress={() => setTab('Events')} /><Chip label="Notes" selected={tab === 'Notes'} onPress={() => setTab('Notes')} /></View>
    {error ? <StateView icon="cloud-offline" tone="danger" title={`Saved ${tab.toLowerCase()} unavailable`} detail={error.message} action="Retry" onAction={retry} /> : loading ? <StateView icon="hourglass-outline" title={`Loading saved ${tab.toLowerCase()}`} detail="Fetching bookmarks and authorized content…" /> : tab === 'Posts' ? (posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <StateView icon="bookmark-outline" title="No saved posts" detail="Use the bookmark control on a post to add it here." action="Browse feed" onAction={() => router.replace('/(tabs)/home')} />) : tab === 'Events' ? (savedEvents.length ? savedEvents.map((event) => <EventCard key={event.id} event={event} />) : <StateView icon="calendar-outline" title="No saved events" detail="Save a published event to keep it here." action="Browse events" onAction={() => router.push('/discover/events')} />) : (notes.length ? notes.map((note) => <Card key={note.id} onPress={() => router.push(`/discover/notes/${note.id}`)} style={{ marginBottom: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Ionicons name="document-text" size={28} color={p.brand} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>{note.title}</Text><Text style={{ color: p.muted, marginTop: 4 }}>{note.subject} · approved material</Text></View><Badge label="Saved" tone="brand" icon="bookmark" /></View></Card>) : <StateView icon="bookmark-outline" title="No saved notes" detail="Bookmark an approved material to keep it here." action="Browse materials" onAction={() => router.push('/discover/notes')} />)}
  </Screen>;
}
