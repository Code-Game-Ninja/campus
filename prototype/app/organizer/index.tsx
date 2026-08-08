import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Body, Button, Card, IconButton, Screen, SectionHeader, StateView, TopBar } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { mapEvent, type ApiEvent, type ApiEventTeam } from '@/lib/events';
import { hasOrganizerAccess, type MeView } from '@/lib/account';

export default function OrganizerDashboard() {
  const p = usePalette();
  const me = useApiQuery<MeView>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const organizer = hasOrganizerAccess(me.data?.roles);
  const eventsQuery = useApiQuery<ApiEvent[]>(apiQueryKey('organizer-events'), '/events', { mine: 'true' }, { enabled: organizer });
  const eventTeamsQuery = useApiQuery<ApiEventTeam[]>(apiQueryKey('organizer-event-teams'), '/events/event-teams/mine', {}, { enabled: organizer });
  const events = useMemo(() => (eventsQuery.data ?? []).map(mapEvent), [eventsQuery.data]);
  const eventTeams = eventTeamsQuery.data ?? [];

  if (me.isLoading) return <Screen><StateView icon="hourglass-outline" title="Checking organizer access" detail="Reading server-issued roles…" /></Screen>;
  if (me.isError) return <Screen><StateView icon="cloud-offline" tone="danger" title="Organizer access unavailable" detail={me.error.message} action="Retry" onAction={() => me.refetch()} /></Screen>;
  if (!organizer) {
    return <Screen><StateView icon="lock-closed-outline" title="Organizer access required" detail="Your server session has no club_admin or campus administrator grant." action="View access status" onAction={() => router.replace('/settings/professional-access')} /></Screen>;
  }

  const title = me.data?.roles.some((role) => role.roleName === 'campus_admin' || role.roleName === 'platform_admin') ? 'Campus Administrator' : 'Club Organizer';
  return <Screen>
    <TopBar title="Organizer workspace" subtitle={`${title} · ${me.data?.campusName ?? 'Campus account'}`} left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/create')} />} />
    <View style={{ borderRadius: 22, padding: 19, backgroundColor: '#DCE7FF' }}><Badge label="Admin approved" tone="success" icon="shield-checkmark" /><Text style={{ color: '#101828', fontSize: 25, lineHeight: 31, fontWeight: '900', marginTop: 12 }}>{title} dashboard</Text><Text style={{ color: '#475467', lineHeight: 20, marginTop: 6 }}>Publish official activities, manage operations and coordinate organization members from one workspace.</Text></View>
    <SectionHeader title="Create and manage" />
    <View style={{ gap: 11 }}>
      <Card onPress={() => router.push('/organizer/create-event')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}><Ionicons name="calendar" size={27} color={p.brand} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Create official event</Text><Body muted>Publish schedules, capacity and venue details.</Body></View><Ionicons name="chevron-forward" size={19} color={p.muted} /></View></Card>
      <Card onPress={() => router.push('/organizer/create-meet')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}><Ionicons name="people-circle" size={27} color={p.warning} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Team meeting scheduling</Text><Body muted>Unavailable until durable meeting and invite APIs exist.</Body></View><Badge label="Backend needed" tone="warning" /></View></Card>
      <Card onPress={() => router.push('/organizer/team')}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}><Ionicons name="sparkles" size={27} color={p.brand} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '800' }}>Manage event teams</Text><Body muted>Recruit leads, review applications and assign visible titles.</Body></View><Ionicons name="chevron-forward" size={19} color={p.muted} /></View></Card>
    </View>
    <SectionHeader title="Workspace overview" />
    <View style={{ flexDirection: 'row', gap: 10 }}><Card style={{ flex: 1 }}><Text style={{ color: p.brand, fontSize: 27, fontWeight: '900' }}>{events.length}</Text><Body muted>Managed events</Body></Card><Card style={{ flex: 1 }}><Text style={{ color: p.brand, fontSize: 27, fontWeight: '900' }}>{eventTeams.length}</Text><Body muted>Event teams</Body></Card></View>
    {eventsQuery.isError ? <StateView icon="cloud-offline" tone="danger" title="Organizer data unavailable" detail={eventsQuery.error.message} action="Retry" onAction={() => eventsQuery.refetch()} /> : null}
    <View style={{ marginTop: 16 }}><Button variant="ghost" label="Professional access and admin messages" onPress={() => router.push('/settings/professional-access')} /></View>
  </Screen>;
}
