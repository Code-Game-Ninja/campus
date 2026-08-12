import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PostCard } from '@/components/cards';
import { Avatar, GradientHero, IconButton, Screen, SectionHeader, Segmented, StateView } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import type { FeedTab } from '@/types';
import { useApiQuery } from '@/lib/api-hooks';
import { apiQueryKey } from '@/lib/api-hooks';
import { feedRank, mapPost, type FeedPage } from '@/lib/feed';
import type { ProfileView } from '@/lib/discovery';
import type { MeView } from '@/lib/account';

const tabs: FeedTab[] = ['For you', 'Following', 'Official'];
export default function Home() {
  const p = usePalette(); const scope = useAppStore((s) => s.scope); const setScope = useAppStore((s) => s.setScope); const feedTab = useAppStore((s) => s.feedTab); const setFeedTab = useAppStore((s) => s.setFeedTab);
  const me = useApiQuery<MeView>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const profile = useApiQuery<ProfileView>(apiQueryKey('profile', me.data?.userId), `/profiles/${me.data?.userId}`, {}, { enabled: Boolean(me.data?.userId) });
  const feed = useApiQuery<FeedPage>(apiQueryKey('feed', scope, feedTab), '/posts', { scope, rank: feedRank(feedTab), limit: 30 });
  const posts = useMemo(() => (feed.data?.items ?? []).map((post) => mapPost(post, 'My campus')), [feed.data?.items]);
  const displayName = profile.data?.displayName ?? 'Campus member'; const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <Screen><View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 16 }}><View style={{ flex: 1 }}><Text style={{ color: p.muted, fontSize: 12, fontWeight: '700' }}>GOOD MORNING</Text><Text style={{ color: p.ink, fontSize: 24, fontWeight: '900', marginTop: 2 }}>Hello, {displayName.split(' ')[0]}</Text></View><IconButton icon="search" label="Search" onPress={() => router.push('/search')} /><View style={{ width: 8 }} /><Pressable accessibilityRole="button" accessibilityLabel="Messages" onPress={() => router.push('/chat')} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}><Ionicons name="chatbubbles-outline" size={21} color={p.text} /></Pressable><View style={{ width: 8 }} /><Pressable onPress={() => router.push('/(tabs)/profile')}><Avatar initials={initials || 'CS'} accent="#FFE6D7" /></Pressable></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Ionicons name="school" size={17} color={p.brand} /><Text style={{ color: p.text, fontSize: 13, fontWeight: '700' }}>{me.data?.campusName ?? 'Campus account'}</Text></View>
    <Segmented values={['campus', 'global'] as const} value={scope} onChange={setScope} />
    <View style={{ marginTop: 14 }}><Segmented values={tabs} value={feedTab} onChange={setFeedTab} /></View>
    <View style={{ marginTop: 16 }}><GradientHero eyebrow="Campus pulse" title={scope === 'campus' ? 'What is happening around you' : 'Ideas travelling across campuses'} detail={scope === 'campus' ? `Fresh conversations, events and useful resources from ${me.data?.campusName ?? 'your campus'}.` : 'Explore verified global updates and cross-campus communities.'} colors={scope === 'campus' ? ['#FFF0C7', '#FFDCEB'] : ['#DCE7FF', '#E7E0FF']} icon={scope === 'campus' ? 'sunny' : 'globe'} /></View>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><SectionHeader title="Your feed" action={feed.isFetching ? 'Refreshing…' : 'Refresh'} onAction={() => feed.refetch()} /><Ionicons name={feed.isError ? 'cloud-offline' : 'cloud-done-outline'} size={20} color={feed.isError ? p.danger : p.success} style={{ marginLeft: 10, marginTop: 11 }} /></View>
    {feed.isError ? <StateView icon="cloud-offline" tone="danger" title="Feed unavailable" detail={feed.error.message} action="Retry" onAction={() => feed.refetch()} /> : feed.isLoading ? <StateView icon="hourglass-outline" title="Loading your feed" detail="Fetching campus posts securely…" /> : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <StateView icon="people-outline" title={feedTab === 'Following' ? 'Nothing from your follows yet' : 'A quiet feed for now'} detail={feedTab === 'Following' ? 'Follow discoverable people to shape this feed.' : scope === 'campus' ? 'Create a discussion or switch to Global to discover more.' : 'Try My Campus or explore categories in Discover.'} action="Explore Discover" onAction={() => router.push('/(tabs)/discover')} />}
  </Screen>;
}
