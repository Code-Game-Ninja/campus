import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, Chip, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiMutation, useApiQuery } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import type { ChatRoom } from '@/lib/chat';
import type { ConnectionView, ProfileView } from '@/lib/discovery';
import type { FollowView } from '@/lib/follows';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const connectionsKey = apiQueryKey('connections');
const followsKey = apiQueryKey('follows', 'people');

export default function PersonProfile() {
  const { id, scope } = useLocalSearchParams<{ id: string; scope?: 'campus' | 'global' }>();
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const profileScope = scope === 'global' ? 'global' : 'campus';
  const profileQuery = useApiQuery<ProfileView>(
    apiQueryKey('profile', id, profileScope),
    `/profiles/${id}`,
    { scope: profileScope },
    { enabled: Boolean(id) },
  );
  const follows = useApiQuery<FollowView[]>(
    followsKey,
    '/follows',
    { type: 'people' },
  );
  const connections = useApiQuery<ConnectionView[]>(connectionsKey, '/connections');
  const connection = connections.data?.find((item) => item.otherUserId === id);

  const updateConnectionCache = (updated: ConnectionView) => {
    queryClient.setQueryData<ConnectionView[]>(connectionsKey, (current) => [
      updated,
      ...(current ?? []).filter((item) => item.id !== updated.id),
    ]);
  };

  const follow = useApiMutation<FollowView, Record<string, never>>(`/follows/people/${id}`, 'POST', {
    onSuccess: (created) => {
      queryClient.setQueryData<FollowView[]>(followsKey, (current) => [
        created,
        ...(current ?? []).filter((item) => item.targetId !== created.targetId),
      ]);
      toast({ type: 'success', message: 'Following updated.' });
    },
    onError: (error) => toast({ type: 'error', message: error.message }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: followsKey }),
  });
  const unfollow = useApiMutation<void, Record<string, never>>(`/follows/people/${id}`, 'DELETE', {
    onSuccess: () => {
      queryClient.setQueryData<FollowView[]>(followsKey, (current) =>
        (current ?? []).filter((item) => item.targetId !== id),
      );
      toast({ type: 'success', message: 'No longer following.' });
    },
    onError: (error) => toast({ type: 'error', message: error.message }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: followsKey }),
  });
  const requestChat = useApiMutation<ConnectionView, { targetUserId: string }>('/connections', 'POST', {
    onSuccess: (created) => {
      updateConnectionCache(created);
      toast({ type: 'success', message: 'Chat request sent.' });
    },
    onError: (error) => toast({ type: 'error', message: error.message }),
  });
  const respond = useApiMutation<ConnectionView, { action: 'cancel' }>(
    `/connections/${connection?.id ?? 'unavailable'}`,
    'PATCH',
    {
      onSuccess: (updated) => {
        updateConnectionCache(updated);
        toast({ type: 'success', message: 'Chat request cancelled.' });
      },
      onError: (error) => toast({ type: 'error', message: error.message }),
    },
  );
  const openChat = useApiMutation<ChatRoom, { type: 'dm'; memberIds: string[] }>('/chat/rooms', 'POST', {
    onSuccess: (room) => router.push(`/chat/${room.id}`),
    onError: (error) => toast({ type: 'error', message: error.message }),
  });

  if (profileQuery.isLoading) {
    return <Screen><StateView icon="hourglass-outline" title="Loading profile" detail="Applying profile audience rules…" /></Screen>;
  }
  if (profileQuery.isError) {
    return <Screen><StateView icon="cloud-offline" tone="danger" title="Profile unavailable" detail={profileQuery.error.message} action="Retry" onAction={() => profileQuery.refetch()} /></Screen>;
  }
  const profile = profileQuery.data;
  if (!profile) {
    return <Screen><StateView icon="person-outline" title="Profile not available" detail="This profile may be private, blocked, or outside your campus." action="Go back" onAction={() => goBackOrReplace('/(tabs)/discover')} /></Screen>;
  }

  const initials = (profile.displayName ?? 'Campus member')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  const isFollowing = Boolean(follows.data?.some((item) => item.targetId === id));
  const connectionBusy = requestChat.isPending || respond.isPending || openChat.isPending;
  const actionError = follow.error
    ?? unfollow.error
    ?? requestChat.error
    ?? respond.error
    ?? openChat.error
    ?? follows.error;

  const chatControls = () => {
    if (connections.isLoading) {
      return <Button label="Checking chat access…" icon="hourglass-outline" variant="secondary" disabled onPress={() => undefined} />;
    }
    if (connections.isError) {
      return (
        <View style={{ gap: 8 }}>
          <View style={{ backgroundColor: p.dangerSoft, borderRadius: 12, padding: 11 }}>
            <Text style={{ color: p.danger, fontWeight: '800' }}>{connections.error.message}</Text>
          </View>
          <Button label="Retry chat access" icon="refresh" variant="ghost" onPress={() => void connections.refetch()} />
        </View>
      );
    }
    if (!connection || connection.state === 'declined' || connection.state === 'ended') {
      return (
        <Button
          label={profile.isCrossCampus ? 'Send Chat Request' : 'Request chat'}
          icon="chatbubble-ellipses-outline"
          loading={requestChat.isPending}
          onPress={() => requestChat.mutate({ targetUserId: id })}
        />
      );
    }
    if (connection.state === 'pending' && connection.direction === 'outgoing') {
      return (
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <View style={{ flex: 1 }}><Button label="Request sent" icon="time-outline" variant="secondary" disabled onPress={() => undefined} /></View>
          <View style={{ flex: 1 }}><Button label="Cancel" variant="ghost" loading={respond.isPending} onPress={() => respond.mutate({ action: 'cancel' })} /></View>
        </View>
      );
    }
    if (connection.state === 'pending') {
      return (
        <Button
          label="Review request"
          icon="mail-unread-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/chat', params: { tab: 'Connections' } })}
        />
      );
    }
    return (
      <Button
        label="Message"
        icon="chatbubble-outline"
        loading={openChat.isPending}
        disabled={connectionBusy && !openChat.isPending}
        onPress={() => openChat.mutate({ type: 'dm', memberIds: [connection.otherUserId] })}
      />
    );
  };

  return (
    <Screen>
      <TopBar title="Profile" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} />
      <Card style={{ marginTop: 8 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: '#E9E6FF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#344054', fontSize: 24, fontWeight: '900' }}>{initials}</Text>
          </View>
          <Text style={{ color: p.ink, fontSize: 24, fontWeight: '900', marginTop: 13 }}>{profile.displayName ?? 'Campus member'}</Text>
          <Text style={{ color: p.muted, marginTop: 5 }}>{profile.department ?? 'Department private'}{profile.studyYear ? ` · Year ${profile.studyYear}` : ''}</Text>
          <View style={{ marginTop: 9 }}><Badge label={profile.discoverable ? 'Open to recommendations' : 'Not discoverable'} tone={profile.discoverable ? 'success' : 'neutral'} /></View>
          {!profile.isSelf ? (
            <View style={{ width: '100%', marginTop: 14, gap: 9 }}>
              {!profile.isCrossCampus ? <Button
                label={isFollowing ? 'Following' : 'Follow'}
                icon={isFollowing ? 'checkmark' : 'person-add'}
                variant={isFollowing ? 'secondary' : 'primary'}
                loading={follow.isPending || unfollow.isPending}
                onPress={() => isFollowing ? unfollow.mutate({}) : follow.mutate({})}
              /> : null}
              {chatControls()}
              {actionError ? (
                <View style={{ backgroundColor: p.dangerSoft, borderRadius: 12, padding: 11 }}>
                  <Text style={{ color: p.danger, fontWeight: '800' }}>{actionError.message}</Text>
                </View>
              ) : null}
              <Body muted style={{ textAlign: 'center' }}>{profile.isCrossCampus ? 'Cross-campus messages unlock only after the other person accepts your request.' : 'Following and chat access are separate. Messages unlock only after the request is accepted.'}</Body>
            </View>
          ) : null}
        </View>
      </Card>
      {profile.bio ? <Card style={{ marginTop: 14 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>About</Text><Body muted style={{ marginTop: 7 }}>{profile.bio}</Body></Card> : null}
      {profile.skills?.length ? <Card style={{ marginTop: 14 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Skills</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>{profile.skills.map((skill) => <Chip key={skill} label={skill} />)}</View></Card> : null}
      {profile.interests?.length ? <Card style={{ marginTop: 14 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Interests</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>{profile.interests.map((interest) => <Chip key={interest} label={interest} />)}</View></Card> : null}
      {profile.links?.map((link) => <Button key={link.url} variant="ghost" label={link.label} icon="open-outline" onPress={() => void Linking.openURL(link.url)} />)}
      <Card style={{ marginTop: 14, flexDirection: 'row', gap: 9 }}>
        <Ionicons name="shield-checkmark" size={20} color={p.brand} />
        <Body style={{ flex: 1 }}>{profile.isCrossCampus ? 'This global profile shows public fields only. Direct messaging requires mutual consent.' : 'Only fields authorized for your relationship and campus are shown. Follows are campus-scoped and block-aware.'}</Body>
      </Card>
    </Screen>
  );
}
