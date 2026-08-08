import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Body, Button, Chip, Field, IconButton, Screen, SectionHeader, StateView, ToggleRow, TopBar } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import { apiPost } from '@/lib/api';
import { queryClient } from '@/lib/query';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';

const starterRoles = ['Operations', 'Design', 'Community & Media', 'Sponsorship'];

export default function CreateOfficialEvent() {
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const me = useApiQuery<{ roles: Array<{ roleName: string }> }>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Technology');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('80');
  const [createTeam, setCreateTeam] = useState(true);
  const [recruit, setRecruit] = useState(true);
  const [roles, setRoles] = useState(['Operations', 'Design', 'Community & Media']);
  const [posting, setPosting] = useState(false);
  const organizer = Boolean(me.data?.roles.some((role) => role.roleName === 'club_admin' || role.roleName === 'campus_admin' || role.roleName === 'platform_admin'));

  const submit = async () => {
    if (!title.trim() || !description.trim() || !venue.trim() || !date.trim() || !time.trim() || (createTeam && roles.length === 0)) return;
    setPosting(true);
    try {
      const startTime = parseDateTime(date, time);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000).toISOString();
      const event = await apiPost<{ id: string }>('/events', {
        title: title.trim(), description: description.trim(), location: venue.trim(), category: category.trim().toLowerCase(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', startTime: startTime.toISOString(), endTime,
        capacity: Number(capacity) || 80, publishImmediately: true,
      });
      if (createTeam) {
        const team = await apiPost<{ id: string }>('/events/' + event.id + '/teams', {
          name: `${title.trim()} Core Team`, purpose: `Plan and deliver ${title.trim()} with clear ownership.`, recruiting: recruit,
          roles: roles.map((role) => ({ title: `${role} Lead`, openings: 1, skills: role === 'Design' ? ['Figma', 'Accessibility'] : role === 'Operations' ? ['Planning', 'Coordination'] : ['Writing', 'Coordination'], description: `Own ${role.toLowerCase()} for the event.` })),
        });
        if (recruit) {
          await apiPost('/posts', { title: `Join the ${title.trim()} team`, body: `We are recruiting ${roles.join(', ')} leads for ${title.trim()}. Apply with your skills and why you want to help.`, scope: 'campus', kind: 'announcement', visibility: 'campus', eventId: event.id, recruitment: true });
        }
        void team;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['api', 'events'] }),
        queryClient.invalidateQueries({ queryKey: ['api', 'organizer-events'] }),
        queryClient.invalidateQueries({ queryKey: ['api', 'organizer-event-teams'] }),
        queryClient.invalidateQueries({ queryKey: ['api', 'feed'] }),
      ]);
      toast({ type: 'success', message: recruit && createTeam ? 'Event and recruitment published.' : 'Official event published.' });
      router.replace('/organizer');
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setPosting(false);
    }
  };

  if (me.isLoading) return <Screen><StateView icon="hourglass-outline" title="Checking organizer role" detail="Reading server authorization…" /></Screen>;
  if (me.isError) return <Screen><StateView icon="cloud-offline" tone="danger" title="Authorization unavailable" detail={me.error.message} action="Retry" onAction={() => me.refetch()} /></Screen>;
  if (!organizer) return <Screen><StateView icon="lock-closed-outline" title="Organizer role required" detail="Only club organizers and campus administrators can publish official events." action="Go back" onAction={() => goBackOrReplace('/organizer')} /></Screen>;
  return <Screen><TopBar title="Create official event" subtitle="Event and organizer team" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/organizer')} />} /><View style={{ gap: 14, marginTop: 14 }}><Field label="Event title" value={title} onChangeText={setTitle} placeholder="Name your event" /><Field label="Category" value={category} onChangeText={setCategory} /><View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Date" value={date} onChangeText={setDate} placeholder="2026-08-20" /></View><View style={{ flex: 1 }}><Field label="Time" value={time} onChangeText={setTime} placeholder="17:00" /></View></View><Field label="Venue" value={venue} onChangeText={setVenue} /><Field label="Capacity" value={capacity} onChangeText={(value) => setCapacity(value.replace(/\D/g, ''))} keyboardType="numeric" /><Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="Explain the event, audience and instructions" /></View><SectionHeader title="Event photos" /><View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 15, padding: 14 }}><Body muted>Photos stay disabled until Azure signed upload, scan, and signed download flow is connected.</Body></View><SectionHeader title="Build organizer team" /><View style={{ backgroundColor: p.surface, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: p.line }}><ToggleRow title="Create a core team" detail="Give members event-specific titles." value={createTeam} onValueChange={setCreateTeam} />{createTeam ? <ToggleRow title="Publish recruitment post" detail="Students apply; organizer reviews." value={recruit} onValueChange={setRecruit} /> : null}</View>{createTeam ? <View style={{ marginTop: 14 }}><Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginBottom: 9 }}>STARTER ROLES</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{starterRoles.map((role) => <Chip key={role} label={role} selected={roles.includes(role)} onPress={() => setRoles(roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role])} />)}</View></View> : null}<View style={{ marginTop: 20 }}><Button label={recruit && createTeam ? 'Publish event + recruitment' : 'Publish official event'} icon="calendar" disabled={!title.trim() || !description.trim() || !venue.trim() || !date.trim() || !time.trim() || (createTeam && !roles.length)} loading={posting} onPress={submit} /></View></Screen>;
}

function parseDateTime(date: string, time: string): Date {
  const parsed = new Date(`${date.trim()}T${time.trim()}:00`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  throw new Error('Use date YYYY-MM-DD and time HH:MM');
}
