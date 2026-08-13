import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import {
  Badge,
  Body,
  Button,
  Card,
  Field,
  IconButton,
  OwnerActions,
  Screen,
  SearchField,
  SectionHeader,
  StateView,
  TopBar,
} from '@/components/ui';
import { apiDelete, apiPatch, apiPost } from '@/lib/api';
import { apiQueryKey, useApiMutation, useApiQuery } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import type { ChatRoom } from '@/lib/chat';
import type { TeamApplication, TeamRequest } from '@/lib/discovery';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

interface MemberSearchHit { id: string; title: string; scope: 'campus' | 'global' }
interface MemberSearchResult { hits: MemberSearchHit[]; degraded: boolean }

export default function TeamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [response, setResponse] = useState('');
  const [busyApplicationId, setBusyApplicationId] = useState<string | null>(null);
  const [openingTeamChat, setOpeningTeamChat] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [debouncedInviteQuery, setDebouncedInviteQuery] = useState('');

  const teamQuery = useApiQuery<TeamRequest>(
    apiQueryKey('team-request', id),
    `/team-requests/${id}`,
    {},
    { enabled: Boolean(id) },
  );
  const team = teamQuery.data;
  const applications = useApiQuery<TeamApplication[]>(
    apiQueryKey('team-applications', id),
    `/team-requests/${id}/applications`,
    {},
    { enabled: Boolean(id && team?.isOwner) },
  );
  const invitationSearch = useApiQuery<MemberSearchResult>(
    apiQueryKey('team-invitation-search', id, team?.scope, debouncedInviteQuery),
    '/search',
    { q: debouncedInviteQuery, type: 'person', scope: team?.scope ?? 'campus', limit: 12 },
    { enabled: Boolean(team?.isOwner && debouncedInviteQuery.length >= 2), staleTime: 10_000 },
  );

  useEffect(() => {
    if (!team) return;
    setTitle(team.title);
    setDescription(team.description ?? '');
    setSkills(team.neededTags.join(', '));
  }, [team]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInviteQuery(inviteQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [inviteQuery]);

  const update = useApiMutation<TeamRequest, Record<string, unknown>>(
    `/team-requests/${id}`,
    'PATCH',
    {
      onSuccess: async (next) => {
        queryClient.setQueryData(apiQueryKey('team-request', id), next);
        setEditing(false);
        toast({ type: 'success', message: 'Team request updated.' });
        void queryClient.invalidateQueries({ queryKey: ['api', 'team-requests'] });
      },
      onError: (error) => toast({ type: 'error', message: error.message }),
    },
  );
  const apply = useApiMutation<TeamApplication, { responseText?: string }>(
    `/team-requests/${id}/applications`,
    'POST',
    {
      onSuccess: (created) => {
        queryClient.setQueryData<TeamRequest>(apiQueryKey('team-request', id), (current) =>
          current ? { ...current, myApplicationId: created.id, myApplicationState: 'pending', myApplicationKind: 'application' } : current,
        );
        toast({ type: 'success', message: 'Application submitted.' });
        setResponse('');
      },
      onError: (error) => toast({ type: 'error', message: error.message }),
    },
  );
  const invite = useApiMutation<TeamApplication, { targetUserId: string }>(
    `/team-requests/${id}/invitations`,
    'POST',
    {
      onSuccess: (created) => {
        queryClient.setQueryData<TeamApplication[]>(apiQueryKey('team-applications', id), (current) => [
          created,
          ...(current ?? []).filter((item) => item.id !== created.id && item.applicantId !== created.applicantId),
        ]);
        toast({ type: 'success', message: 'Team invitation sent.' });
      },
      onError: (error) => toast({ type: 'error', message: error.message }),
    },
  );

  const openTeamChat = async (): Promise<void> => {
    setOpeningTeamChat(true);
    try {
      const room = await apiPost<ChatRoom>(`/chat/team-requests/${id}`, {});
      queryClient.setQueryData<ChatRoom[]>(apiQueryKey('chat-rooms'), (current) => {
        if (!current) return [room];
        return current.some((item) => item.id === room.id) ? current : [room, ...current];
      });
      router.push(`/chat/${room.id}`);
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setOpeningTeamChat(false);
    }
  };

  const openApplicantChat = async (application: TeamApplication): Promise<void> => {
    const room = await apiPost<ChatRoom>('/chat/rooms', {
      type: 'dm',
      memberIds: [application.applicantId],
    });
    queryClient.setQueryData<ChatRoom[]>(apiQueryKey('chat-rooms'), (current) => {
      if (!current) return [room];
      return current.some((item) => item.id === room.id) ? current : [room, ...current];
    });
    router.push(`/chat/${room.id}`);
  };

  const answer = async (
    application: TeamApplication,
    decision: 'accept' | 'decline',
  ): Promise<void> => {
    setBusyApplicationId(application.id);
    try {
      const updated = await apiPatch<TeamApplication>(
        `/team-requests/${id}/applications/${application.id}`,
        { decision },
      );
      queryClient.setQueryData<TeamApplication[]>(
        apiQueryKey('team-applications', id),
        (current) => current?.map((item) => item.id === updated.id ? updated : item) ?? [updated],
      );
      toast({
        type: 'success',
        message: `Application ${decision === 'accept' ? 'accepted' : 'declined'}.`,
      });
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('connections') });
      if (decision === 'accept') await openTeamChat();
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setBusyApplicationId(null);
    }
  };

  const answerInvitation = async (decision: 'accept' | 'decline'): Promise<void> => {
    if (!team?.myApplicationId) return;
    setBusyApplicationId(team.myApplicationId);
    try {
      await apiPatch<TeamApplication>(
        `/team-requests/${id}/invitations/${team.myApplicationId}`,
        { decision },
      );
      queryClient.setQueryData<TeamRequest>(apiQueryKey('team-request', id), (current) => current ? {
        ...current,
        myApplicationState: decision === 'accept' ? 'accepted' : 'declined',
      } : current);
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('team-invitations', 'mine') });
      toast({ type: 'success', message: `Invitation ${decision === 'accept' ? 'accepted' : 'declined'}.` });
      if (decision === 'accept') {
        void queryClient.invalidateQueries({ queryKey: apiQueryKey('connections') });
        await openTeamChat();
      }
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setBusyApplicationId(null);
    }
  };

  const withdrawApplication = async (): Promise<void> => {
    if (!team?.myApplicationId) return;
    setBusyApplicationId(team.myApplicationId);
    try {
      await apiDelete<TeamApplication>(`/team-requests/${id}/applications/${team.myApplicationId}`);
      queryClient.setQueryData<TeamRequest>(apiQueryKey('team-request', id), (current) => current ? {
        ...current,
        myApplicationId: null,
        myApplicationState: null,
        myApplicationKind: null,
      } : current);
      void queryClient.invalidateQueries({ queryKey: ['api', 'team-requests'] });
      toast({ type: 'success', message: 'Application withdrawn. You can apply again while request is open.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setBusyApplicationId(null);
    }
  };

  if (teamQuery.isLoading) {
    return <Screen><StateView icon="hourglass-outline" title="Loading team request" detail="Fetching collaboration details…" /></Screen>;
  }
  if (teamQuery.isError) {
    return <Screen><StateView icon="cloud-offline" tone="danger" title="Team unavailable" detail={teamQuery.error.message} action="Retry" onAction={() => teamQuery.refetch()} /></Screen>;
  }
  if (!team) {
    return <Screen><StateView icon="people-outline" title="Team not available" detail="This request is private, closed, or outside your scope." action="Go back" onAction={() => goBackOrReplace('/discover/tribe')} /></Screen>;
  }

  const pending = applications.data?.filter((application) => application.state === 'pending') ?? [];
  const accepted = applications.data?.filter((application) => application.state === 'accepted') ?? [];
  const declined = applications.data?.filter((application) => application.state === 'declined') ?? [];
  const archived = applications.data?.filter((application) => application.state === 'withdrawn' || application.state === 'cancelled') ?? [];

  return (
    <Screen>
      <TopBar
        title={team.title}
        subtitle={`${team.campusName ?? (team.scope === 'global' ? 'Global CampusSphere' : 'Campus not selected')} · ${team.scope} team request`}
        left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/discover/tribe')} />}
        right={team.isOwner ? <OwnerActions target="team request" onEdit={() => setEditing(true)} onDelete={() => update.mutate({ status: 'closed', version: team.version })} /> : undefined}
      />
      {editing ? (
        <Card style={{ gap: 14 }}>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Goal" value={description} onChangeText={setDescription} multiline />
          <Field label="Skills" value={skills} onChangeText={setSkills} />
          <Button label="Save request" loading={update.isPending} disabled={!title.trim()} onPress={() => update.mutate({ title: title.trim(), description: description.trim(), neededTags: skills.split(',').map((item) => item.trim()).filter(Boolean), version: team.version })} />
          <Button variant="ghost" label="Cancel" onPress={() => setEditing(false)} />
        </Card>
      ) : (
        <>
          <View style={{ backgroundColor: '#E9E6FF', borderRadius: 22, padding: 19 }}>
            <View style={{ flexDirection: 'row', gap: 7 }}>
              <Badge label={team.status} tone={team.status === 'open' ? 'success' : 'warning'} />
              <Badge label={`Capacity ${team.capacity ?? 'open'}`} />
            </View>
            <Text style={{ color: '#101828', fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 12 }}>{team.description ?? 'Goal-focused collaboration.'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
              {team.neededTags.map((tag) => <Badge key={tag} label={tag} tone="brand" />)}
            </View>
            {(team.isOwner || team.myApplicationState === 'accepted') ? (
              <View style={{ marginTop: 16 }}>
                <Button label="Open team chat" icon="chatbubbles-outline" loading={openingTeamChat} onPress={openTeamChat} />
              </View>
            ) : null}
          </View>
          {team.isOwner ? (
            <View style={{ marginTop: 16 }}>
              <Card style={{ gap: 12, marginBottom: 8 }}>
                <Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Invite a member</Text>
                <Body muted>Only you, as team owner, can send invitations. Search by name, username, or email.</Body>
                <SearchField value={inviteQuery} onChangeText={setInviteQuery} placeholder={`Search ${team.scope === 'global' ? 'CampusSphere' : 'your campus'}`} />
                {debouncedInviteQuery.length === 1 ? <Body muted>Enter at least two characters.</Body>
                  : invitationSearch.isLoading ? <Body muted>Searching members…</Body>
                    : invitationSearch.isError ? <Body muted>{invitationSearch.error.message}</Body>
                      : invitationSearch.data?.hits.map((person) => (
                        <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '800' }}>{person.title}</Text><Body muted>{person.scope === 'global' ? 'Global member' : 'Campus member'}</Body></View>
                          <Button compact label="Invite" loading={invite.isPending && invite.variables?.targetUserId === person.id} disabled={invite.isPending} onPress={() => invite.mutate({ targetUserId: person.id })} />
                        </View>
                      ))}
              </Card>
              {applications.isLoading ? (
                <StateView icon="hourglass-outline" title="Loading applications" detail="Fetching applicant responses…" />
              ) : applications.isError ? (
                <StateView icon="cloud-offline" tone="danger" title="Applications unavailable" detail={applications.error.message} action="Retry" onAction={() => applications.refetch()} />
              ) : (
                <>
                  <SectionHeader title={`Pending requests (${pending.length})`} />
                  {pending.length ? pending.map((application) => (
                    <ApplicationCard key={application.id} application={application} ink={p.ink} busy={busyApplicationId === application.id} onDecision={application.kind === 'application' ? (decision) => answer(application, decision) : undefined} />
                  )) : <StateView icon="mail-open-outline" title="No pending requests" detail="New applicants and invitations will appear here." />}

                  <SectionHeader title={`Accepted members (${accepted.length})`} />
                  {accepted.length ? accepted.map((application) => (
                    <ApplicationCard key={application.id} application={application} ink={p.ink} busy={busyApplicationId === application.id} onMessage={async () => {
                      setBusyApplicationId(application.id);
                      try { await openApplicantChat(application); }
                      catch (error) { toast({ type: 'error', message: (error as Error).message }); }
                      finally { setBusyApplicationId(null); }
                    }} />
                  )) : <Body muted>No accepted members yet.</Body>}

                  {declined.length ? (
                    <>
                      <SectionHeader title={`Declined history (${declined.length})`} />
                      {declined.map((application) => <ApplicationCard key={application.id} application={application} ink={p.ink} />)}
                    </>
                  ) : null}
                  {archived.length ? (
                    <>
                      <SectionHeader title={`Withdrawn or cancelled (${archived.length})`} />
                      {archived.map((application) => <ApplicationCard key={application.id} application={application} ink={p.ink} />)}
                    </>
                  ) : null}
                </>
              )}
            </View>
          ) : team.myApplicationState === 'accepted' ? (
            <Card style={{ marginTop: 16, gap: 12 }}>
              <Badge label="Accepted team member" tone="success" />
              <Body muted>You can chat with owner and every accepted member in shared team room.</Body>
            </Card>
          ) : team.myApplicationState === 'pending' && team.myApplicationKind === 'invitation' ? (
            <Card style={{ marginTop: 16, gap: 12 }}>
              <Badge label="Team invitation" tone="warning" />
              <Body>The team owner invited you to join. Accepting opens the shared team chat.</Body>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <View style={{ flex: 1 }}><Button variant="ghost" label="Decline" disabled={Boolean(busyApplicationId)} onPress={() => void answerInvitation('decline')} /></View>
                <View style={{ flex: 1 }}><Button label="Accept" loading={Boolean(busyApplicationId)} onPress={() => void answerInvitation('accept')} /></View>
              </View>
            </Card>
          ) : team.myApplicationState === 'pending' ? (
            <Card style={{ marginTop: 16, gap: 12 }}>
              <Badge label="Application pending" tone="warning" />
              <Body muted>Team owner has not decided your application yet.</Body>
              <Button variant="ghost" label="Withdraw application" loading={Boolean(busyApplicationId)} onPress={() => void withdrawApplication()} />
            </Card>
          ) : team.status === 'open' ? (
            <Card style={{ marginTop: 16, gap: 12 }}>
              <Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>{team.applicationPrompt ?? 'Why are you a good fit?'}</Text>
              <Field label="Application response" value={response} onChangeText={setResponse} multiline />
              <Button label="Apply to team" loading={apply.isPending} onPress={() => apply.mutate({ responseText: response.trim() || undefined })} />
            </Card>
          ) : (
            <StateView icon="lock-closed-outline" title="Applications closed" detail="Owner closed this team request." />
          )}
        </>
      )}
    </Screen>
  );
}

function ApplicationCard({
  application,
  ink,
  busy = false,
  onDecision,
  onMessage,
}: {
  application: TeamApplication;
  ink: string;
  busy?: boolean;
  onDecision?: (decision: 'accept' | 'decline') => void;
  onMessage?: () => void;
}) {
  const name = application.applicantDisplayName?.trim() || 'Campus member';
  return (
    <Card style={{ marginBottom: 10 }}>
      <Text style={{ color: ink, fontWeight: '800', fontSize: 16 }}>{name}</Text>
      <Body muted style={{ marginTop: 6 }}>{application.kind === 'invitation' ? 'Invited by team owner.' : application.responseText ?? 'No response provided.'}</Body>
      <View style={{ marginTop: 10 }}>
        <Badge label={application.state} tone={application.state === 'accepted' ? 'success' : application.state === 'pending' ? 'warning' : application.state === 'withdrawn' || application.state === 'cancelled' ? 'neutral' : 'danger'} />
      </View>
      {application.state === 'pending' && onDecision ? (
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 12 }}>
          <View style={{ flex: 1 }}><Button compact variant="ghost" label="Decline" disabled={busy} onPress={() => onDecision('decline')} /></View>
          <View style={{ flex: 1 }}><Button compact label="Accept & message" loading={busy} onPress={() => onDecision('accept')} /></View>
        </View>
      ) : application.state === 'accepted' && onMessage ? (
        <View style={{ marginTop: 12 }}><Button compact label="Message member" loading={busy} onPress={onMessage} /></View>
      ) : null}
    </Card>
  );
}
