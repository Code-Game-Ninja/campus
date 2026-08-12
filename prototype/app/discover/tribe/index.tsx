import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Card, Chip, IconButton, Screen, SearchField, SectionHeader, Segmented, StateView, ToggleRow, TopBar } from '@/components/ui';
import { apiQueryKey, useApiMutation, useApiQuery } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import type { ProfileView, Recommendation, TeamApplication, TeamRequestPage } from '@/lib/discovery';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

type Tab = 'Find people' | 'Teams';
interface PeopleSearchHit { id: string; title: string; scope: 'campus' | 'global' }
interface PeopleSearchResult { hits: PeopleSearchHit[]; degraded: boolean; requestId?: string }

export default function Tribe() {
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const [tab, setTab] = useState<Tab>('Find people');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [skill, setSkill] = useState('All');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const me = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me');
  const ownProfile = useApiQuery<ProfileView>(apiQueryKey('profile', me.data?.userId), `/profiles/${me.data?.userId}`, {}, { enabled: Boolean(me.data?.userId) });
  const recommendations = useApiQuery<Recommendation[]>(apiQueryKey('recommendations'), '/recommendations', { limit: 30 });
  const peopleSearch = useApiQuery<PeopleSearchResult>(
    apiQueryKey('team-finder-global-search', debouncedQuery),
    '/search',
    { q: debouncedQuery, type: 'person', scope: 'global', limit: 30 },
    { enabled: debouncedQuery.length >= 2, staleTime: 10_000 },
  );
  const teams = useApiQuery<TeamRequestPage>(apiQueryKey('team-requests', 'open'), '/team-requests', { status: 'open', limit: 100 });
  const invitations = useApiQuery<TeamApplication[]>(apiQueryKey('team-invitations', 'mine'), '/team-requests/invitations/mine');
  const updateProfile = useApiMutation<ProfileView, { discoverable: boolean }>('/profiles/me', 'PATCH', {
    onSuccess: (profile) => {
      queryClient.setQueryData(apiQueryKey('profile', me.data?.userId), profile);
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('recommendations') });
      toast({ type: 'success', message: profile.discoverable ? 'Discoverability enabled.' : 'Discoverability disabled.' });
    },
    onError: (error) => toast({ type: 'error', message: error.message }),
  });

  const profileTags = Array.from(new Set([...(ownProfile.data?.skills ?? []), ...(ownProfile.data?.interests ?? [])]));
  const recommended = (recommendations.data ?? []).filter((person) => skill === 'All' || person.matchedTags.includes(skill));
  const isSearching = debouncedQuery.length >= 2;

  return <Screen>
    <TopBar title="Team Finder" subtitle="Find anyone or build a goal-focused team" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} />
    <Segmented values={['Find people', 'Teams'] as const} value={tab} onChange={setTab} />
    {tab === 'Find people' ? <>
      <Card style={{ marginTop: 14, paddingHorizontal: 14 }}>
        <ToggleRow title="Show me in recommendations" detail="Recommendations use the skills and interests saved on your profile." value={ownProfile.data?.discoverable ?? false} disabled={!ownProfile.data || updateProfile.isPending} onValueChange={(discoverable) => updateProfile.mutate({ discoverable })} />
      </Card>
      <View style={{ marginTop: 14 }}><SearchField value={query} onChangeText={setQuery} placeholder="Search anyone by name or username" /></View>
      {query.trim().length === 1 ? <StateView icon="search-outline" title="Keep typing" detail="Enter at least two characters to search across CampusSphere." /> : isSearching ? <>
        <SectionHeader title="Global people" />
        {peopleSearch.isLoading ? <StateView icon="hourglass-outline" title="Searching people" detail="Checking active, discoverable profiles…" />
          : peopleSearch.isError ? <StateView icon="cloud-offline" tone="danger" title="People search unavailable" detail={peopleSearch.error.message} action="Retry" onAction={() => peopleSearch.refetch()} />
            : peopleSearch.data?.degraded ? <StateView icon="cloud-offline" tone="warning" title="Search is temporarily unavailable" detail="Try again shortly or browse recommendations below." />
              : peopleSearch.data?.hits.length ? peopleSearch.data.hits.map((person) => (
                <Card key={person.id} onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id, scope: person.scope } } as never)} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#E9E6FF', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#344054', fontWeight: '900' }}>{person.title.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</Text></View>
                    <View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>{person.title}</Text><Body muted>Global CampusSphere member</Body></View>
                    <Ionicons name="chevron-forward" size={19} color={p.muted} />
                  </View>
                </Card>
              )) : <StateView icon="people-outline" title="No matching people" detail="Only active, discoverable, unblocked profiles appear." />}
      </> : <>
        {profileTags.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>{['All', ...profileTags].map((item) => <Chip key={item} label={item} selected={skill === item} onPress={() => setSkill(item)} />)}</View> : null}
        <SectionHeader title="Recommended for you" />
        {recommendations.isError ? <StateView icon="cloud-offline" tone="danger" title="Recommendations unavailable" detail={recommendations.error.message} action="Retry" onAction={() => recommendations.refetch()} />
          : recommendations.isLoading ? <StateView icon="hourglass-outline" title="Loading recommendations" detail="Matching opt-in profile fields…" />
            : recommended.length ? recommended.map((person) => <Card key={person.userId} onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.userId, scope: person.scope } } as never)} style={{ marginBottom: 12 }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#E9E6FF', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#344054', fontWeight: '900' }}>{(person.displayName ?? 'Member').split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</Text></View><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>{person.displayName ?? 'Campus member'}</Text><Body muted>{person.department ?? 'Department private'}</Body></View><Ionicons name="chevron-forward" size={19} color={p.muted} /></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>{person.matchedTags.map((tag) => <Badge key={tag} label={tag} tone="brand" />)}</View><Body muted style={{ marginTop: 8 }}>{person.explanations.map((value) => value.replace(/_/g, ' ')).join(' · ')}</Body></Card>)
              : <StateView icon="people-outline" title="No recommendations" detail="Search above to find any discoverable member without matching interests." />}
      </>}
    </> : <>
      {invitations.data?.length ? <>
        <SectionHeader title={`Your invitations (${invitations.data.length})`} />
        {invitations.data.map((invitation) => <Card key={invitation.id} onPress={() => router.push(`/discover/tribe/team/${invitation.teamRequestId}`)} style={{ marginBottom: 10 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1 }}><Badge label="Invitation" tone="warning" /><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800', marginTop: 8 }}>{invitation.teamTitle ?? 'Team invitation'}</Text><Body muted>Open to accept or decline.</Body></View><Ionicons name="chevron-forward" size={19} color={p.muted} /></View></Card>)}
      </> : null}
      <SectionHeader title="Open team requests" action="Create team request" onAction={() => router.push('/discover/tribe/new-team')} />
      {teams.isError ? <StateView icon="cloud-offline" tone="danger" title="Teams unavailable" detail={teams.error.message} action="Retry" onAction={() => teams.refetch()} />
        : teams.isLoading ? <StateView icon="hourglass-outline" title="Loading teams" detail="Fetching open requests…" />
          : teams.data?.items.length ? teams.data.items.map((team) => <Card key={team.id} onPress={() => router.push(`/discover/tribe/team/${team.id}`)} style={{ marginBottom: 12 }}><View style={{ height: 78, borderRadius: 14, backgroundColor: '#E9E6FF', padding: 14, justifyContent: 'center' }}><Text style={{ color: '#101828', fontSize: 18, fontWeight: '900' }}>{team.title}</Text><Text style={{ color: '#475467', fontSize: 12, marginTop: 4 }}>{team.scope} · capacity {team.capacity ?? 'open'}</Text></View><Body style={{ marginTop: 12 }}>{team.description ?? 'Goal-focused collaboration request.'}</Body><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>{team.neededTags.map((tag) => <Badge key={tag} label={tag} tone="brand" />)}</View></Card>)
            : <StateView icon="people-outline" title="No open team requests" detail="Create a request describing your goal and needed skills." action="Create request" onAction={() => router.push('/discover/tribe/new-team')} />}
    </>}
  </Screen>;
}
