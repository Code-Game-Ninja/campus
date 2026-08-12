import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { CampusEvent, Post } from '@/types';
import { Avatar, Badge, Body, Button, Card, OwnerActions, SafetyMenu } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';
import { useAppStore } from '@/store/useAppStore';
import { useApiMutation, useApiQuery } from '@/lib/api-hooks';
import { apiDelete, apiPost } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { apiQueryKey } from '@/lib/api-hooks';
import type { QueryKey } from '@tanstack/react-query';
import { setPostBookmark, setPostLike, type ApiPost, type FeedPage } from '@/lib/feed';

type PostCacheSnapshot = {
  feeds: Array<[QueryKey, FeedPage | undefined]>;
  detail: ApiPost | undefined;
};

export function PostCard({ post, detail = false }: { post: Post; detail?: boolean }) {
  const p = usePalette(); const toast = useAppStore((s) => s.showToast); const [why, setWhy] = useState(false); const [likeOverride, setLikeOverride] = useState<boolean | null>(null); const [bookmarkOverride, setBookmarkOverride] = useState<boolean | null>(null); const [pollOverride, setPollOverride] = useState<Post['poll']>(); const [pollBusy, setPollBusy] = useState<string | null>(null);
  const liked = likeOverride ?? Boolean(post.reacted);
  const bookmarked = bookmarkOverride ?? Boolean(post.saved);
  const poll = pollOverride ?? post.poll;
  const me = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const feedMutation = useApiMutation<{ added: boolean }, { kind: 'like'; enabled: boolean }, PostCacheSnapshot>(`/posts/${post.id}/reactions`, 'POST', {
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['api', 'feed'] }),
        queryClient.cancelQueries({ queryKey: apiQueryKey('post', post.id) }),
      ]);
      const snapshot = getPostCacheSnapshot(post.id);
      updatePostCaches(post.id, (item) => setPostLike(item, !liked));
      return snapshot;
    },
    onSuccess: (result) => { setLikeOverride(null); updatePostCaches(post.id, (item) => setPostLike(item, result.added)); },
    onError: (error, _variables, snapshot) => {
      setLikeOverride(null);
      restorePostCacheSnapshot(post.id, snapshot);
      toast({ type: 'error', message: error.message });
    },
  });
  const bookmarkMutation = useApiMutation<{ bookmarked: boolean }, { targetType: 'post'; targetId: string; bookmarked: boolean }, PostCacheSnapshot>('/bookmarks', 'POST', {
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['api', 'feed'] }),
        queryClient.cancelQueries({ queryKey: apiQueryKey('post', post.id) }),
      ]);
      const snapshot = getPostCacheSnapshot(post.id);
      updatePostCaches(post.id, (item) => setPostBookmark(item, !bookmarked));
      return snapshot;
    },
    onSuccess: (result) => {
      setBookmarkOverride(null);
      updatePostCaches(post.id, (item) => setPostBookmark(item, result.bookmarked));
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('bookmarks'), refetchType: 'inactive' });
    },
    onError: (error, _variables, snapshot) => {
      setBookmarkOverride(null);
      restorePostCacheSnapshot(post.id, snapshot);
      toast({ type: 'error', message: error.message });
    },
  });
  const isOwner = Boolean(me.data?.userId && me.data.userId === post.authorId);
  const openAuthor = () => post.authorType === 'person' && post.authorId ? router.push(`/people/${post.authorId}`) : undefined;
  const votePoll = async (optionId: string, selected: boolean) => {
    setPollBusy(optionId);
    try {
      const updated = await apiPost<NonNullable<Post['poll']>>(`/posts/${post.id}/poll-votes/${optionId}`, { selected });
      setPollOverride(updated);
      void queryClient.invalidateQueries({ queryKey: ['api', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('post', post.id) });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setPollBusy(null);
    }
  };
  return <Card style={{ marginBottom: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Pressable disabled={!post.authorId} onPress={openAuthor}><Avatar initials={post.initials} accent={post.accent} /></Pressable><Pressable disabled={!post.authorId} onPress={openAuthor} style={{ flex: 1 }}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={{ color: p.ink, fontWeight: '800' }}>{post.author}</Text>{post.official ? <Ionicons name="checkmark-circle" size={15} color="#0E9384" /> : null}</View><Text style={{ color: p.muted, fontSize: 12, marginTop: 2 }}>{post.role ? `${post.role} · ` : ''}{post.time} · {post.scope === 'campus' ? 'My Campus' : 'Global'}</Text></Pressable>{isOwner ? <OwnerActions target="post" onEdit={() => router.push({ pathname: '/post/[id]', params: { id: post.id, edit: '1' } })} onDelete={async () => { try { await apiDelete(`/posts/${post.id}`); await queryClient.invalidateQueries({ queryKey: ['api', 'feed'] }); toast({ type: 'success', message: 'Post deleted.' }); } catch (error) { toast({ type: 'error', message: (error as Error).message }); } }} /> : <SafetyMenu target={post.title ?? 'post'} targetType="post" targetId={post.id} userId={post.authorType === 'person' ? post.authorId : undefined} />}</View>
    <Pressable disabled={detail} onPress={() => router.push(`/post/${post.id}`)}><View style={{ backgroundColor: post.accent, borderRadius: 14, minHeight: 112, marginTop: 14, padding: 16, justifyContent: 'flex-end' }}>{post.title ? <Text style={{ color: '#101828', fontSize: 19, lineHeight: 25, fontWeight: '900' }}>{post.title}</Text> : <Ionicons name="happy-outline" size={34} color="#344054" />}<Text style={{ color: '#344054', fontSize: 14, lineHeight: 20, marginTop: 8 }}>{post.body}</Text>{post.mediaItems?.length ? <View style={{ flexDirection: 'row', gap: 7, marginTop: 13 }}>{post.mediaItems.slice(0, 3).map((item, index) => item.type === 'image' ? <Image key={`${item.url}-${index}`} source={{ uri: item.url }} style={{ flex: 1, height: 92, borderRadius: 11, backgroundColor: '#FFFFFF99' }} resizeMode="cover" /> : <Pressable key={`${item.url}-${index}`} onPress={() => void Linking.openURL(item.url)} style={{ flex: 1, height: 92, borderRadius: 11, backgroundColor: '#FFFFFF99', alignItems: 'center', justifyContent: 'center', padding: 8 }}><Ionicons name="document-text-outline" size={24} color="#475467" /><Text numberOfLines={2} style={{ color: '#475467', fontSize: 10, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>{item.name ?? 'Document'}</Text></Pressable>)}</View> : null}</View></Pressable>
    {post.eventId ? <View style={{ marginTop: 10 }}><Button compact label="View event" icon="calendar-outline" onPress={() => router.push(`/discover/events/${post.eventId}`)} /></View> : null}
    {post.teamRequestId ? <View style={{ marginTop: 10 }}><Button compact label="View team request" icon="people-outline" onPress={() => router.push(`/discover/tribe/team/${post.teamRequestId}`)} /></View> : null}
    {post.linkPreview ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(post.linkPreview!.url)} style={({ pressed }) => ({ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, padding: 12, opacity: pressed ? 0.7 : 1 })}><Text numberOfLines={1} style={{ color: p.brand, fontWeight: '800' }}>{post.linkPreview.title}</Text><Text numberOfLines={2} style={{ color: p.muted, fontSize: 11, marginTop: 4 }}>{post.linkPreview.description ?? post.linkPreview.url}</Text></Pressable> : null}
    {poll ? <View style={{ marginTop: 12, gap: 8 }}>{poll.options.map((option) => { const total = poll.options.reduce((sum, item) => sum + item.votes, 0); const percent = total ? Math.round((option.votes / total) * 100) : 0; return <Pressable key={option.id} disabled={Boolean(pollBusy) || Boolean(poll.closesAt && new Date(poll.closesAt) <= new Date())} onPress={() => void votePoll(option.id, !option.viewerSelected)} style={({ pressed }) => ({ borderRadius: 12, borderWidth: 1, borderColor: option.viewerSelected ? p.brand : p.line, backgroundColor: option.viewerSelected ? p.brandSoft : p.surface, padding: 11, opacity: pressed || pollBusy === option.id ? 0.65 : 1 })}><View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ flex: 1, color: p.ink, fontWeight: '700' }}>{option.label}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{option.votes} · {percent}%</Text></View></Pressable>; })}<Body muted>{poll.closesAt ? `Closes ${new Date(poll.closesAt).toLocaleString()}` : 'Poll stays open'}{poll.allowsMultiple ? ' · Multiple choices' : ' · One choice'}</Body></View> : null}
    {why ? <View style={{ backgroundColor: p.brandSoft, padding: 12, borderRadius: 12, marginTop: 12, flexDirection: 'row', gap: 8 }}><Ionicons name="information-circle" size={18} color={p.brand} /><Text style={{ flex: 1, color: p.text, fontSize: 12, lineHeight: 18 }}>{post.why}</Text></View> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 13, gap: 3 }}><Pressable onPress={() => { const enabled = !liked; setLikeOverride(enabled); feedMutation.mutate({ kind: 'like', enabled }); }} disabled={feedMutation.isPending} style={{ minWidth: 60, height: 42, flexDirection: 'row', alignItems: 'center', gap: 5 }}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={21} color={liked ? p.brand : p.muted} /><Text style={{ color: p.muted, fontWeight: '700' }}>{post.reactions + (liked !== Boolean(post.reacted) ? (liked ? 1 : -1) : 0)}</Text></Pressable><Pressable disabled={detail} onPress={() => router.push(`/post/${post.id}`)} style={{ minWidth: 60, height: 42, flexDirection: 'row', alignItems: 'center', gap: 5 }}><Ionicons name="chatbubble-outline" size={20} color={p.muted} /><Text style={{ color: p.muted, fontWeight: '700' }}>{post.comments}</Text></Pressable><Pressable onPress={() => setWhy(!why)} style={{ height: 42, flexDirection: 'row', alignItems: 'center', gap: 5 }}><Ionicons name="information-circle-outline" size={20} color={p.muted} /><Text style={{ color: p.muted, fontSize: 12, fontWeight: '700' }}>Why this?</Text></Pressable><View style={{ flex: 1 }} /><Pressable onPress={() => { const next = !bookmarked; setBookmarkOverride(next); bookmarkMutation.mutate({ targetType: 'post', targetId: post.id, bookmarked: next }); }} disabled={bookmarkMutation.isPending} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={21} color={bookmarked ? p.brand : p.muted} /></Pressable></View>
  </Card>;
}

export function EventCard({ event }: { event: CampusEvent }) {
  const p = usePalette(); const limited = event.capacity > 0; const full = limited && event.attendees >= event.capacity;
  return <Card onPress={() => router.push(`/discover/events/${event.id}`)} style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}><View style={{ height: 105, backgroundColor: event.accent, padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}><View><Badge label={event.category} tone="neutral" /><Text style={{ color: '#101828', fontSize: 19, lineHeight: 24, fontWeight: '900', maxWidth: 230, marginTop: 12 }}>{event.title}</Text></View><Ionicons name="calendar" size={30} color="#344054" /></View><View style={{ padding: 14, gap: 8 }}><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><Ionicons name="time-outline" size={17} color={p.brand} /><Body>{event.date} · {event.time} {event.timezone}</Body></View><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><Ionicons name="location-outline" size={17} color={p.brand} /><Body muted>{event.venue}</Body></View><Badge label={!limited ? 'Open attendance' : full ? 'Full' : `${event.capacity - event.attendees} spots left`} tone={full ? 'danger' : 'success'} icon={full ? 'close-circle' : 'people'} /></View></Card>;
}

function getPostCacheSnapshot(postId: string): PostCacheSnapshot {
  return {
    feeds: queryClient.getQueriesData<FeedPage>({ queryKey: ['api', 'feed'] }),
    detail: queryClient.getQueryData<ApiPost>(apiQueryKey('post', postId)),
  };
}

function restorePostCacheSnapshot(postId: string, snapshot: PostCacheSnapshot | undefined): void {
  if (!snapshot) return;
  for (const [key, data] of snapshot.feeds) queryClient.setQueryData(key, data);
  queryClient.setQueryData(apiQueryKey('post', postId), snapshot.detail);
}

function updatePostCaches(postId: string, update: (post: ApiPost) => ApiPost): void {
  queryClient.setQueriesData<FeedPage>({ queryKey: ['api', 'feed'] }, (page) => page ? {
    ...page,
    items: page.items.map((item) => item.id === postId ? update(item) : item),
  } : page);
  queryClient.setQueryData<ApiPost>(apiQueryKey('post', postId), (item) => item ? update(item) : item);
}
