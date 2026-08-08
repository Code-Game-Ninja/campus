import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiMutation, useApiQuery } from '@/lib/api-hooks';
import type { ApiClub, ApiClubMember } from '@/lib/clubs';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import type { FollowView } from '@/lib/follows';

export default function ClubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const clubQuery = useApiQuery<ApiClub>(apiQueryKey('club', id), `/communities/clubs/${id}`, {}, { enabled: Boolean(id) });
  const membersQuery = useApiQuery<ApiClubMember[]>(apiQueryKey('club-members', id), `/communities/clubs/${id}/members`, {}, { enabled: Boolean(id) });
  const meQuery = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me');
  const followsQuery = useApiQuery<FollowView[]>(apiQueryKey('follows', 'clubs'), '/follows', { type: 'clubs' });
  const join = useApiMutation<ApiClubMember, Record<string, never>>(`/communities/clubs/${id}/members`, 'POST', { onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: apiQueryKey('club-members', id) }); toast({ type: 'success', message: 'You joined the club.' }); }, onError: (error) => toast({ type: 'error', message: error.message }) });
  const follow = useApiMutation<FollowView, Record<string, never>>(`/follows/clubs/${id}`, 'POST', { onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: apiQueryKey('follows', 'clubs') }); toast({ type: 'success', message: 'Club followed.' }); }, onError: (error) => toast({ type: 'error', message: error.message }) });
  const unfollow = useApiMutation<void, Record<string, never>>(`/follows/clubs/${id}`, 'DELETE', { onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: apiQueryKey('follows', 'clubs') }); toast({ type: 'success', message: 'Club unfollowed.' }); }, onError: (error) => toast({ type: 'error', message: error.message }) });
  if (clubQuery.isLoading || membersQuery.isLoading) return <Screen><StateView icon="hourglass-outline" title="Loading club" detail="Fetching community details…" /></Screen>;
  if (clubQuery.isError) return <Screen><StateView icon="cloud-offline" tone="danger" title="Club unavailable" detail={clubQuery.error.message} action="Retry" onAction={() => clubQuery.refetch()} /></Screen>;
  const club = clubQuery.data;
  if (!club) return <Screen><StateView icon="people-outline" title="Club not available" detail="This club may be private or outside your campus." action="Go back" onAction={() => goBackOrReplace('/discover/clubs')} /></Screen>;
  const members = membersQuery.data ?? [];
  const membership = members.find((member) => member.userId === meQuery.data?.userId && member.status === 'active');
  const isFollowing = Boolean(followsQuery.data?.some((item) => item.targetId === id));
  return <Screen><TopBar title="Club" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/discover/clubs')} />} /><View style={{ height: 190, backgroundColor: '#E9E6FF', borderRadius: 24, padding: 20, justifyContent: 'space-between' }}><View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="people" size={29} color="#344054" /></View><View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Text style={{ color: '#101828', fontSize: 28, fontWeight: '900' }}>{club.name}</Text>{club.verificationStatus === 'verified' ? <Ionicons name="checkmark-circle" size={22} color={p.success} /> : null}</View><Text style={{ color: '#475467', marginTop: 5 }}>{club.type} · {members.length} members</Text></View></View><View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}><Badge label={club.visibility} /><Badge label={club.verificationStatus} tone={club.verificationStatus === 'verified' ? 'success' : 'warning'} /></View><Body style={{ marginTop: 16 }}>Campus community created {new Date(club.createdAt).toLocaleDateString()}.</Body><View style={{ marginTop: 15, gap: 8 }}><Button label={isFollowing ? 'Following' : 'Follow club'} icon={isFollowing ? 'checkmark' : 'notifications-outline'} variant={isFollowing ? 'secondary' : 'primary'} loading={follow.isPending || unfollow.isPending} onPress={() => isFollowing ? unfollow.mutate({}) : follow.mutate({})} /><Button label={membership ? `Joined as ${membership.role}` : 'Join club'} icon={membership ? 'checkmark' : 'add'} variant="secondary" disabled={Boolean(membership) || join.isPending} loading={join.isPending} onPress={() => join.mutate({})} /></View><Card style={{ marginTop: 18 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Club activity</Text><Body muted style={{ marginTop: 6 }}>Followed club posts now appear in Following feed. Dedicated club event/resource aggregation and leave action remain separate work.</Body></Card></Screen>;
}
