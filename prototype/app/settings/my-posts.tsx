import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { PostCard } from '@/components/cards';
import { Badge, Body, Button, Card, Chip, Field, IconButton, OwnerActions, Screen, StateView, TopBar } from '@/components/ui';
import { apiDelete, apiPatch } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { TeamRequestPage } from '@/lib/discovery';
import { feedRank, mapPost, type FeedPage } from '@/lib/feed';
import type { ApiResource } from '@/lib/resources';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const tabs = ['Posts', 'Materials', 'Teams'] as const;
type Tab = (typeof tabs)[number];

type MaterialReviewState = {
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'danger';
  icon: 'checkmark-circle' | 'time-outline' | 'shield-outline' | 'close-circle';
};

function materialReviewState(material: ApiResource): MaterialReviewState {
  if (material.scanState === 'quarantined') {
    return { label: 'Quarantined', detail: 'The safety scan detected an unsafe file. It cannot be published.', tone: 'danger', icon: 'shield-outline' };
  }
  if (material.scanState === 'rejected') {
    return { label: 'Scan rejected', detail: 'The file type or safety scan failed. Upload a valid document and try again.', tone: 'danger', icon: 'close-circle' };
  }
  if (material.status === 'rejected') {
    return { label: 'Not approved', detail: 'A moderator did not approve this material.', tone: 'danger', icon: 'close-circle' };
  }
  if (material.status === 'approved' && material.scanState === 'clean') {
    return { label: 'Published', detail: 'Safety checks and moderator review are complete.', tone: 'success', icon: 'checkmark-circle' };
  }
  if (material.scanState === 'clean') {
    return { label: 'Awaiting approval', detail: 'The safety scan passed. A moderator still needs to review it.', tone: 'warning', icon: 'time-outline' };
  }
  return { label: 'Scanning', detail: 'The file is private while automated safety checks run.', tone: 'warning', icon: 'shield-outline' };
}

export default function MyContent() {
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const [tab, setTab] = useState<Tab>('Posts');
  const [editingMaterial, setEditingMaterial] = useState<ApiResource | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);
  const me = useApiQuery<{ userId: string; campusId: string }>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const postsQuery = useApiQuery<FeedPage>(apiQueryKey('my-content', 'posts'), '/posts', { rank: feedRank('For you'), limit: 100 });
  const materialsQuery = useApiQuery<{ items: ApiResource[] }>(apiQueryKey('my-content', 'materials'), '/resources', { mine: 'true', limit: 100 });
  const teamQuery = useApiQuery<TeamRequestPage>(apiQueryKey('my-content', 'teams'), '/team-requests', { limit: 100 });
  const userId = me.data?.userId;
  const posts = useMemo(() => (postsQuery.data?.items ?? []).filter((post) => post.author.userId === userId).map((post) => mapPost(post, me.data?.campusId ?? 'My campus')), [me.data?.campusId, postsQuery.data?.items, userId]);
  const teams = useMemo(() => (teamQuery.data?.items ?? []).filter((team) => team.isOwner), [teamQuery.data?.items]);
  const materials = materialsQuery.data?.items ?? [];
  const count = tab === 'Posts' ? posts.length : tab === 'Materials' ? materials.length : teams.length;
  const loading = me.isLoading || (tab === 'Posts' ? postsQuery.isLoading : tab === 'Materials' ? materialsQuery.isLoading : teamQuery.isLoading);
  const error = me.error ?? (tab === 'Posts' ? postsQuery.error : tab === 'Materials' ? materialsQuery.error : teamQuery.error);
  const refetch = () => { void me.refetch(); if (tab === 'Posts') void postsQuery.refetch(); if (tab === 'Materials') void materialsQuery.refetch(); if (tab === 'Teams') void teamQuery.refetch(); };
  const create = () => router.push(tab === 'Posts' ? '/compose' : tab === 'Materials' ? '/discover/notes/upload' : '/discover/tribe/new-team');
  const editMaterial = (material: ApiResource) => { setEditingMaterial(material); setMaterialTitle(material.title); setMaterialDescription(material.description ?? ''); };
  const saveMaterial = async () => { if (!editingMaterial || !materialTitle.trim()) return; setSavingMaterial(true); try { await apiPatch(`/resources/${editingMaterial.id}`, { title: materialTitle.trim(), description: materialDescription.trim() }); await materialsQuery.refetch(); setEditingMaterial(null); toast({ type: 'success', message: 'Material updated.' }); } catch (cause) { toast({ type: 'error', message: (cause as Error).message }); } finally { setSavingMaterial(false); } };
  const deleteMaterial = async (id: string) => { try { await apiDelete(`/resources/${id}`); await materialsQuery.refetch(); toast({ type: 'success', message: 'Material removed.' }); } catch (cause) { toast({ type: 'error', message: (cause as Error).message }); } };

  return <Screen><TopBar title="My content" subtitle={`${count} ${tab.toLowerCase()} you can manage`} left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} right={<Button compact label="Create" icon="add" onPress={create} />} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>{tabs.map((item) => <Chip key={item} label={item} selected={tab === item} onPress={() => setTab(item)} />)}</View>
    {error ? <StateView icon="cloud-offline" tone="danger" title="Your content is unavailable" detail={error.message} action="Retry" onAction={refetch} /> : loading ? <StateView icon="hourglass-outline" title="Loading your content" detail="Checking ownership with the server…" /> : count === 0 ? <StateView icon="create-outline" title={`No ${tab.toLowerCase()} yet`} detail="Create content, then manage it from its detail screen." action={`Create ${tab === 'Teams' ? 'team request' : tab.slice(0, -1).toLowerCase()}`} onAction={create} /> : <>
      {tab === 'Posts' ? posts.map((post) => <PostCard key={post.id} post={post} />) : null}
      {tab === 'Materials' ? <View style={{ gap: 11 }}>{editingMaterial ? <Card style={{ gap: 12 }}><Field label="Title" value={materialTitle} onChangeText={setMaterialTitle} /><Field label="Description" value={materialDescription} onChangeText={setMaterialDescription} multiline /><View style={{ flexDirection: 'row', gap: 9 }}><View style={{ flex: 1 }}><Button variant="ghost" label="Cancel" onPress={() => setEditingMaterial(null)} /></View><View style={{ flex: 1 }}><Button label="Save" loading={savingMaterial} disabled={!materialTitle.trim()} onPress={() => void saveMaterial()} /></View></View></Card> : null}{materials.map((material) => { const review = materialReviewState(material); return <Card key={material.id}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Ionicons name="document-text" size={27} color={p.brand} /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>{material.title}</Text><Badge label={review.label} tone={review.tone} icon={review.icon} /><Body muted>{review.detail}</Body></View><OwnerActions target="material" onEdit={() => editMaterial(material)} onDelete={() => void deleteMaterial(material.id)} /></View></Card>; })}</View> : null}
      {tab === 'Teams' ? <View style={{ gap: 11 }}>{teams.map((team) => <Card key={team.id} onPress={() => router.push(`/discover/tribe/team/${team.id}`)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Ionicons name="people" size={23} color="#344054" /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>{team.title}</Text><Body muted>{team.status} · {team.neededTags.join(' · ') || 'Open collaboration request'}</Body></View><Badge label="Owner" tone="brand" /></View></Card>)}</View> : null}
    </>}
  </Screen>;
}
