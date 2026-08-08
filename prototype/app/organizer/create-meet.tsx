import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, Field, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiPost } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { ApiEventTeam } from '@/lib/events';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

interface TeamMeeting { id: string; title: string; agenda: string | null; startsAt: string; endsAt: string; location: string | null; onlineUrl: string | null; status: 'scheduled' | 'cancelled' | 'completed' }

export default function CreateTeamMeet() {
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const teams = useApiQuery<ApiEventTeam[]>(apiQueryKey('organizer-event-teams'), '/events/event-teams/mine');
  const team = teams.data?.[0];
  const meetings = useApiQuery<TeamMeeting[]>(apiQueryKey('team-meetings', team?.id), `/events/${team?.eventId}/teams/${team?.id}/meetings`, {}, { enabled: Boolean(team) });
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!team || !title.trim() || !startsAt || !endsAt || (!location.trim() && !onlineUrl.trim())) return;
    setSaving(true);
    try {
      await apiPost(`/events/${team.eventId}/teams/${team.id}/meetings`, { title: title.trim(), agenda: agenda.trim() || undefined, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), location: location.trim() || undefined, onlineUrl: onlineUrl.trim() || undefined });
      await meetings.refetch();
      setTitle(''); setAgenda(''); setStartsAt(''); setEndsAt(''); setLocation(''); setOnlineUrl('');
      toast({ type: 'success', message: 'Team meeting scheduled.' });
    } catch (cause) { toast({ type: 'error', message: (cause as Error).message }); } finally { setSaving(false); }
  };
  if (teams.isLoading) return <Screen><StateView icon="hourglass-outline" title="Loading organizer team" detail="Checking your event workspace…" /></Screen>;
  if (teams.isError) return <Screen><StateView icon="cloud-offline" tone="danger" title="Team unavailable" detail={teams.error.message} action="Retry" onAction={() => teams.refetch()} /></Screen>;
  if (!team) return <Screen><StateView icon="people-outline" title="No organizer team" detail="Create an event team before scheduling meetings." action="Create event" onAction={() => router.replace('/organizer/create-event')} /></Screen>;
  const validDates = !Number.isNaN(new Date(startsAt).getTime()) && !Number.isNaN(new Date(endsAt).getTime()) && new Date(endsAt) > new Date(startsAt);
  return <Screen><TopBar title="Schedule team meet" subtitle={team.name} left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/organizer')} />} />
    <Card style={{ gap: 13, marginTop: 12 }}><Field label="Meeting title" value={title} onChangeText={setTitle} placeholder="Production check-in" /><Field label="Agenda" value={agenda} onChangeText={setAgenda} multiline /><Field label="Starts at" value={startsAt} onChangeText={setStartsAt} placeholder="2026-08-10T16:00:00+05:30" /><Field label="Ends at" value={endsAt} onChangeText={setEndsAt} placeholder="2026-08-10T17:00:00+05:30" /><Field label="Campus location" value={location} onChangeText={setLocation} placeholder="Room or venue" /><Field label="HTTPS meeting link" value={onlineUrl} onChangeText={setOnlineUrl} placeholder="https://meet.example.com/..." /><Body muted>Provide campus location, HTTPS meeting link, or both. Only organizer can schedule or change meetings; active team members can view them.</Body><Button label="Schedule meeting" icon="calendar" loading={saving} disabled={!title.trim() || !validDates || (!location.trim() && !onlineUrl.trim())} onPress={() => void submit()} /></Card>
    <Text style={{ color: p.ink, fontSize: 18, fontWeight: '900', marginTop: 22, marginBottom: 10 }}>Scheduled meetings</Text>
    {meetings.isError ? <StateView icon="cloud-offline" tone="danger" title="Meetings unavailable" detail={meetings.error.message} action="Retry" onAction={() => meetings.refetch()} /> : meetings.isLoading ? <StateView icon="hourglass-outline" title="Loading meetings" detail="Fetching team schedule…" /> : (meetings.data ?? []).length ? <View style={{ gap: 10 }}>{meetings.data?.map((meeting) => <Card key={meeting.id}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '900' }}>{meeting.title}</Text><Body muted>{new Date(meeting.startsAt).toLocaleString()} · {meeting.location ?? 'Online'}</Body></View><Badge label={meeting.status} tone={meeting.status === 'scheduled' ? 'success' : 'neutral'} /></View>{meeting.agenda ? <Body style={{ marginTop: 8 }}>{meeting.agenda}</Body> : null}</Card>)}</View> : <StateView icon="calendar-outline" title="No meetings scheduled" detail="New meetings will appear here for organizer and active team members." />}
  </Screen>;
}
