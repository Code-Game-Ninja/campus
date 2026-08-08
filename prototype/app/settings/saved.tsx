import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { PostCard } from '@/components/cards';
import { Badge, Card, Chip, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { mapPost, type FeedPage } from '@/lib/feed';
import { mapResource, type ApiResource } from '@/lib/resources';
import type { ApiListingPage } from '@/lib/marketplace';
import { usePalette } from '@/theme/usePalette';

type Tab = 'Posts' | 'Notes' | 'Listings';
interface BookmarkRow { target_type: string; target_id: string }

export default function Saved() {
  const p = usePalette();
  const [tab, setTab] = useState<Tab>('Posts');
  const me = useApiQuery<{ campusId: string }>(apiQueryKey('me'), '/me', {}, { staleTime: 300_000 });
  const bookmarks = useApiQuery<BookmarkRow[]>(apiQueryKey('bookmarks'), '/bookmarks');
  const feed = useApiQuery<FeedPage>(apiQueryKey('saved-post-candidates'), '/posts', { limit: 100 });
  const resources = useApiQuery<{ items: ApiResource[] }>(apiQueryKey('saved-resource-candidates'), '/resources', { limit: 100 });
  const marketplace = useApiQuery<ApiListingPage>(apiQueryKey('saved-listing-candidates', 'marketplace'), '/listings', { type: 'marketplace', limit: 100 });
  const lost = useApiQuery<ApiListingPage>(apiQueryKey('saved-listing-candidates', 'lost'), '/listings', { type: 'lost', limit: 100 });
  const found = useApiQuery<ApiListingPage>(apiQueryKey('saved-listing-candidates', 'found'), '/listings', { type: 'found', limit: 100 });
  const ids = (type: string) => new Set((bookmarks.data ?? []).filter((item) => item.target_type === type).map((item) => item.target_id));
  const savedPostIds = useMemo(() => ids('post'), [bookmarks.data]);
  const savedResourceIds = useMemo(() => ids('resource'), [bookmarks.data]);
  const savedListingIds = useMemo(() => ids('listing'), [bookmarks.data]);
  const posts = useMemo(() => (feed.data?.items ?? []).filter((post) => savedPostIds.has(post.id)).map((post) => mapPost(post, me.data?.campusId ?? 'My campus')), [feed.data?.items, me.data?.campusId, savedPostIds]);
  const notes = useMemo(() => (resources.data?.items ?? []).filter((item) => savedResourceIds.has(item.id)).map(mapResource), [resources.data?.items, savedResourceIds]);
  const listings = useMemo(() => [marketplace, lost, found].flatMap((query) => query.data?.items ?? []).filter((item) => savedListingIds.has(item.id)), [marketplace.data?.items, lost.data?.items, found.data?.items, savedListingIds]);
  const active = tab === 'Posts' ? [feed, me] : tab === 'Notes' ? [resources] : [marketplace, lost, found];
  const error = bookmarks.error ?? active.find((query) => query.error)?.error;
  const loading = bookmarks.isLoading || active.some((query) => query.isLoading);
  const retry = () => { void bookmarks.refetch(); active.forEach((query) => void query.refetch()); };

  return <Screen><TopBar title="Saved items" subtitle="Private server-backed bookmarks" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} /><View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}><Chip label="Posts" selected={tab === 'Posts'} onPress={() => setTab('Posts')} /><Chip label="Notes" selected={tab === 'Notes'} onPress={() => setTab('Notes')} /><Chip label="Listings" selected={tab === 'Listings'} onPress={() => setTab('Listings')} /></View>
    {error ? <StateView icon="cloud-offline" tone="danger" title={`Saved ${tab.toLowerCase()} unavailable`} detail={error.message} action="Retry" onAction={retry} /> : loading ? <StateView icon="hourglass-outline" title={`Loading saved ${tab.toLowerCase()}`} detail="Fetching bookmarks and authorized content…" /> : tab === 'Posts' ? (posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <StateView icon="bookmark-outline" title="No saved posts" detail="Use the bookmark control on a post to add it here." action="Browse feed" onAction={() => router.replace('/(tabs)/home')} />) : tab === 'Notes' ? (notes.length ? notes.map((note) => <Card key={note.id} onPress={() => router.push(`/discover/notes/${note.id}`)} style={{ marginBottom: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Ionicons name="document-text" size={28} color={p.brand} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>{note.title}</Text><Text style={{ color: p.muted, marginTop: 4 }}>{note.subject} · approved material</Text></View><Badge label="Saved" tone="brand" icon="bookmark" /></View></Card>) : <StateView icon="bookmark-outline" title="No saved notes" detail="Bookmark an approved material to keep it here." action="Browse materials" onAction={() => router.push('/discover/notes')} />) : (listings.length ? <View style={{ gap: 10 }}>{listings.map((listing) => <Card key={listing.id} onPress={() => router.push(`/discover/listings/${listing.id}`)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>{listing.title}</Text><Text style={{ color: p.muted, marginTop: 4 }}>{listing.type} · {listing.status}</Text></View><Badge label="Saved" tone="brand" icon="bookmark" /></View></Card>)}</View> : <StateView icon="bookmark-outline" title="No saved listings" detail="Bookmark a listing to keep it here." action="Browse listings" onAction={() => router.push('/discover/listings')} />)}
  </Screen>;
}
