import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Avatar, Body, Button, Card, Field, IconButton, OwnerActions, Screen, SectionHeader, StateView, TopBar } from '@/components/ui';
import { PostCard } from '@/components/cards';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import { apiDelete, apiPost, apiRequest } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import { mapPost, relativeTime, type ApiComment, type ApiPost, type CommentPage } from '@/lib/feed';

export default function PostDetail() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const postQuery = useApiQuery<ApiPost>(apiQueryKey('post', id), `/posts/${id}`, {}, { enabled: Boolean(id) });
  const commentsQuery = useApiQuery<CommentPage>(apiQueryKey('post-comments', id), `/posts/${id}/comments`, { limit: 100 }, { enabled: Boolean(id) });
  const meQuery = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const post = useMemo(() => postQuery.data ? mapPost(postQuery.data, 'My campus') : null, [postQuery.data]);
  const [editing, setEditing] = useState(edit === '1');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (!postQuery.data) return;
    setTitle(postQuery.data.title ?? '');
    setBody(postQuery.data.body);
  }, [postQuery.data]);

  if (postQuery.isLoading) return <Screen><StateView icon="hourglass-outline" title="Loading post" detail="Fetching current post and ownership state…" /></Screen>;
  if (postQuery.isError || !post || !postQuery.data) return <Screen><StateView icon="document-outline" title="Post not available" detail={postQuery.error?.message ?? 'It may be private, removed, or outside your current campus scope.'} action="Go back" onAction={() => goBackOrReplace('/(tabs)/home')} /></Screen>;

  const owner = meQuery.data?.userId === post.authorId;
  const comments = commentsQuery.data?.items ?? [];
  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await apiRequest<ApiPost>(`/posts/${post.id}`, {
        method: 'PATCH',
        body: { title: title.trim(), body: body.trim() },
        headers: { 'If-Match': String(postQuery.data.version) },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKey('post', id) }),
        queryClient.invalidateQueries({ queryKey: ['api', 'feed'] }),
      ]);
      setEditing(false);
      toast({ type: 'success', message: 'Post updated.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await apiDelete(`/posts/${post.id}`);
      await queryClient.invalidateQueries({ queryKey: ['api', 'feed'] });
      toast({ type: 'success', message: 'Post deleted.' });
      router.replace('/(tabs)/home');
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };
  const addComment = async () => {
    if (!text.trim()) return;
    setCommenting(true);
    try {
      await apiPost<ApiComment>(`/posts/${post.id}/comments`, { body: text.trim() });
      setText('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKey('post-comments', id) }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey('post', id) }),
        queryClient.invalidateQueries({ queryKey: ['api', 'feed'] }),
      ]);
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setCommenting(false);
    }
  };

  return <Screen><TopBar title="Post" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/home')} />} right={owner ? <OwnerActions target="post" onEdit={() => setEditing(true)} onDelete={remove} /> : undefined} />{editing ? <Card style={{ gap: 14, marginBottom: 16 }}><Text style={{ color: p.ink, fontSize: 19, fontWeight: '900' }}>Edit post</Text><Field label="Title (optional)" value={title} onChangeText={setTitle} /><Field label="Post" value={body} onChangeText={setBody} multiline /><View style={{ flexDirection: 'row', gap: 9 }}><View style={{ flex: 1 }}><Button variant="ghost" label="Cancel" onPress={() => setEditing(false)} /></View><View style={{ flex: 1 }}><Button label="Save changes" disabled={!body.trim()} loading={saving} onPress={save} /></View></View></Card> : <PostCard post={post} detail />}<SectionHeader title={`Comments · ${comments.length}`} />{commentsQuery.isError ? <StateView icon="cloud-offline" tone="danger" title="Comments unavailable" detail={commentsQuery.error.message} action="Retry" onAction={() => commentsQuery.refetch()} /> : commentsQuery.isLoading ? <StateView icon="hourglass-outline" title="Loading comments" detail="Fetching current discussion…" /> : comments.map((item) => <CommentCard key={item.id} item={item} />)}{!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 ? <Body muted>No comments yet. Start a helpful discussion.</Body> : null}<View style={{ marginTop: 16, gap: 10 }}><Field label="Add a comment" value={text} onChangeText={setText} placeholder="Write a helpful response…" multiline /><Button label="Post comment" onPress={addComment} disabled={!text.trim()} loading={commenting} /></View></Screen>;
}

function CommentCard({ item }: { item: ApiComment }) {
  const p = usePalette();
  const initials = item.author.displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CS';
  return <Card style={{ marginBottom: 10 }}><View style={{ flexDirection: 'row', gap: 10 }}><Avatar initials={initials} size={38} accent="#E9E6FF" /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row' }}><Text style={{ flex: 1, color: p.ink, fontWeight: '800' }}>{item.author.displayName}</Text><Text style={{ color: p.muted, fontSize: 11 }}>{relativeTime(item.createdAt)}</Text></View><Body style={{ marginTop: 5 }}>{item.body}</Body></View></View></Card>;
}
