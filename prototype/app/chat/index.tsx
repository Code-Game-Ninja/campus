import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, Chip, IconButton, Screen, SearchField, SectionHeader, StateView, TopBar } from '@/components/ui';
import { apiPatch, apiPost } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { ChatRoom } from '@/lib/chat';
import type { ConnectionView } from '@/lib/discovery';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

type Tab = 'Chats' | 'Connections';
interface PeopleSearchHit { id: string; title: string; excerpt?: string | null; scope: 'campus' | 'global'; }
interface PeopleSearchResult { hits: PeopleSearchHit[]; degraded: boolean; }

export default function ChatList() {
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(requestedTab === 'Connections' ? 'Connections' : 'Chats');
  const [busy, setBusy] = useState<string | null>(null);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [debouncedPeopleQuery, setDebouncedPeopleQuery] = useState('');
  const me = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me');
  const rooms = useApiQuery<ChatRoom[]>(apiQueryKey('chat-rooms'), '/chat/rooms', {}, { refetchInterval: 10_000 });
  const connections = useApiQuery<ConnectionView[]>(apiQueryKey('connections'), '/connections', {}, { refetchInterval: 15_000 });
  const peopleSearch = useApiQuery<PeopleSearchResult>(
    apiQueryKey('chat-people-search', debouncedPeopleQuery),
    '/search',
    { q: debouncedPeopleQuery, type: 'person', scope: 'global', limit: 30 },
    { enabled: tab === 'Connections' && debouncedPeopleQuery.length >= 2, staleTime: 10_000 },
  );

  useEffect(() => {
    if (requestedTab === 'Connections') setTab('Connections');
  }, [requestedTab]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPeopleQuery(peopleQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [peopleQuery]);

  const act = async (connection: ConnectionView, action: 'accept' | 'decline' | 'cancel' | 'end') => {
    setBusy(connection.id);
    try {
      await apiPatch(`/connections/${connection.id}`, { action });
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('connections') });
      const result = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : action === 'cancel' ? 'cancelled' : 'ended';
      toast({ type: 'success', message: `Connection ${result}.` });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const openChat = async (connection: ConnectionView) => {
    setBusy(connection.id);
    try {
      // The API is idempotent for a DM pair, so this is safe across multiple
      // devices and simultaneous taps without relying on stale client caches.
      const room = await apiPost<ChatRoom>('/chat/rooms', {
        type: 'dm',
        memberIds: [connection.otherUserId],
      });
      queryClient.setQueryData<ChatRoom[]>(apiQueryKey('chat-rooms'), (current) => {
        if (!current) return [room];
        return current.some((item) => item.id === room.id) ? current : [room, ...current];
      });
      router.push(`/chat/${room.id}`);
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const requestChat = async (person: PeopleSearchHit) => {
    setBusy(`search:${person.id}`);
    try {
      const created = await apiPost<ConnectionView>('/connections', { targetUserId: person.id });
      queryClient.setQueryData<ConnectionView[]>(apiQueryKey('connections'), (current) => [
        created,
        ...(current ?? []).filter((item) => item.otherUserId !== person.id),
      ]);
      toast({ type: 'success', message: 'Chat request sent.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const loading = me.isLoading || rooms.isLoading || connections.isLoading;
  const error = me.error ?? rooms.error ?? connections.error;
  const teamRooms = rooms.data?.filter((room) => room.type !== 'dm') ?? [];
  const directRooms = rooms.data?.filter((room) => room.type === 'dm') ?? [];
  const refresh = async () => {
    await Promise.all([me.refetch(), rooms.refetch(), connections.refetch(), debouncedPeopleQuery.length >= 2 ? peopleSearch.refetch() : Promise.resolve()]);
  };

  const renderRoom = (room: ChatRoom) => {
    const counterpart = room.type === 'dm' ? room.members.find((member) => member.userId !== me.data?.userId) : undefined;
    const title = room.name ?? counterpart?.displayName?.trim() ?? (room.type === 'dm' ? 'Campus member' : 'Team chat');
    return (
      <Card key={room.id} onPress={() => router.push(`/chat/${room.id}`)} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: room.type === 'dm' ? '#E9E6FF' : '#DDF7EA', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={room.type === 'dm' ? 'person' : 'people'} size={22} color="#344054" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: p.ink, fontSize: 16, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: p.muted, fontSize: 12, marginTop: 4 }}>{room.members.length} members · {room.type === 'dm' ? 'direct message' : 'shared team chat'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={p.muted} />
        </View>
      </Card>
    );
  };

  return (
    <Screen refreshing={me.isRefetching || rooms.isRefetching || connections.isRefetching || peopleSearch.isRefetching} onRefresh={refresh}>
      <TopBar title="Messages" subtitle="Encrypted at rest, private but reportable" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/home')} />} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Chip label="Chats" selected={tab === 'Chats'} onPress={() => setTab('Chats')} />
        <Chip label="Connections" selected={tab === 'Connections'} onPress={() => setTab('Connections')} />
      </View>
      {error ? (
        <StateView icon="cloud-offline" tone="danger" title="Messaging unavailable" detail={error.message} action="Retry" onAction={() => { me.refetch(); rooms.refetch(); connections.refetch(); }} />
      ) : loading ? (
        <StateView icon="hourglass-outline" title="Loading messages" detail="Fetching authorized rooms and connections…" />
      ) : tab === 'Chats' ? (
        <>
          <SectionHeader title={`Team chats (${teamRooms.length})`} />
          {teamRooms.length ? teamRooms.map(renderRoom) : <Body muted>No shared team chats yet.</Body>}
          <SectionHeader title={`Direct messages (${directRooms.length})`} />
          {directRooms.length ? directRooms.map(renderRoom) : <Body muted>No direct messages yet.</Body>}
          {!rooms.data?.length ? <StateView icon="chatbubbles-outline" title="No chats" detail="Join a team or accept a connection to start a conversation." action="Find collaborators" onAction={() => router.push('/discover/tribe')} /> : null}
        </>
      ) : (
        <>
          <SearchField value={peopleQuery} onChangeText={setPeopleQuery} placeholder="Search people by name or username" />
          {peopleQuery.trim().length === 1 ? <StateView icon="search-outline" title="Keep typing" detail="Enter at least two characters." /> : null}
          {debouncedPeopleQuery.length >= 2 ? (
            <>
              <SectionHeader title="Find people to chat" />
              {peopleSearch.isLoading ? <StateView icon="hourglass-outline" title="Searching people" detail="Checking active, discoverable profiles…" />
                : peopleSearch.isError ? <StateView icon="cloud-offline" tone="danger" title="People search unavailable" detail={peopleSearch.error.message} action="Retry" onAction={() => peopleSearch.refetch()} />
                  : peopleSearch.data?.hits.length ? peopleSearch.data.hits.map((person) => {
                    const connection = connections.data?.find((item) => item.otherUserId === person.id);
                    const key = `search:${person.id}`;
                    return (
                      <Card key={person.id} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9E6FF', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="person" size={21} color="#344054" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: p.ink, fontSize: 15, fontWeight: '800' }}>{person.title}</Text>
                            {person.excerpt ? <Body muted>{person.excerpt}</Body> : null}
                          </View>
                          {connection?.state === 'accepted' ? <Button compact label="Message" loading={busy === connection.id} onPress={() => openChat(connection)} />
                            : connection?.state === 'pending' ? <Button compact variant="secondary" label={connection.direction === 'incoming' ? 'Review below' : 'Request sent'} disabled onPress={() => undefined} />
                              : <Button compact label="Request chat" loading={busy === key} onPress={() => requestChat(person)} />}
                        </View>
                      </Card>
                    );
                  }) : <StateView icon="people-outline" title="No matching people" detail="Only active, discoverable, unblocked profiles appear." />}
            </>
          ) : null}
          <SectionHeader title="Chat requests and connections" />
          {connections.data?.length ? connections.data.map((connection) => (
            <Card key={connection.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE6D7', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={21} color="#344054" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.ink, fontSize: 15, fontWeight: '800' }}>{connection.otherDisplayName?.trim() || 'Campus member'}</Text>
                  <Body muted>{connection.origin.replace(/_/g, ' ')} · {connection.isCrossCampus ? 'cross-campus' : 'same campus'}</Body>
                </View>
                <Badge
                  label={connection.state === 'pending' ? (connection.direction === 'incoming' ? 'needs review' : 'request sent') : connection.state}
                  tone={connection.state === 'accepted' ? 'success' : connection.state === 'pending' ? 'warning' : 'neutral'}
                />
              </View>
              {connection.state === 'pending' && connection.direction === 'incoming' ? (
                <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
                  <View style={{ flex: 1 }}><Button compact variant="ghost" label="Decline" disabled={busy === connection.id} onPress={() => act(connection, 'decline')} /></View>
                  <View style={{ flex: 1 }}><Button compact label="Accept" loading={busy === connection.id} onPress={() => act(connection, 'accept')} /></View>
                </View>
              ) : connection.state === 'pending' ? (
                <View style={{ marginTop: 14 }}>
                  <Button compact variant="ghost" label="Cancel request" loading={busy === connection.id} onPress={() => act(connection, 'cancel')} />
                </View>
              ) : connection.state === 'accepted' ? (
                <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
                  <View style={{ flex: 1 }}><Button compact variant="ghost" label="End connection" disabled={busy === connection.id} onPress={() => act(connection, 'end')} /></View>
                  <View style={{ flex: 1 }}><Button compact label="Message" loading={busy === connection.id} onPress={() => openChat(connection)} /></View>
                </View>
              ) : null}
            </Card>
          )) : <StateView icon="mail-open-outline" title="No chat requests" detail="Open a member profile to request chat access. Following someone does not unlock messages." />}
        </>
      )}
    </Screen>
  );
}
