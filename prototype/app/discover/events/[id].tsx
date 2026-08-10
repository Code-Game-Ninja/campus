import { useMemo, useState } from 'react';
import { Linking, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Avatar, Badge, Body, Button, Card, IconButton, Screen, Segmented, StateView, TopBar } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';
import { apiDelete, apiPost } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import { mapEvent, type ApiEvent } from '@/lib/events';
import { useAppStore } from '@/store/useAppStore';

type Tab = 'Details' | 'Gallery';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const eventQuery = useApiQuery<ApiEvent>(apiQueryKey('event', id), `/events/${id}`, {}, { enabled: Boolean(id) });
  const event = useMemo(() => eventQuery.data ? mapEvent(eventQuery.data) : null, [eventQuery.data]);
  const [tab, setTab] = useState<Tab>('Details');

  if (eventQuery.isLoading) return <Screen><StateView icon="hourglass-outline" title="Loading event" detail="Fetching official event details…" /></Screen>;
  if (eventQuery.isError || !event || !eventQuery.data) return <Screen><StateView icon="calendar-outline" title="Event not available" detail={eventQuery.error?.message ?? 'It may have ended or been removed.'} action="Go back" onAction={() => goBackOrReplace('/discover/events')} /></Screen>;

  const registrationLabel = event.registered ? 'Cancel registration' : eventQuery.data.userRegistrationStatus === 'waitlisted' ? 'Leave waitlist' : event.capacity > 0 && event.attendees >= event.capacity ? 'Join waitlist' : 'Register for event';
  const register = async () => {
    try {
      const active = event.registered || eventQuery.data.userRegistrationStatus === 'waitlisted';
      if (active) await apiDelete(`/events/${event.id}/registrations`);
      else await apiPost(`/events/${event.id}/registrations`, undefined, `registration-${event.id}-${Date.now()}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKey('event', id) }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey('events', 'published') }),
      ]);
      toast({ type: 'success', message: active ? 'Event registration removed.' : event.capacity > 0 && event.attendees >= event.capacity ? 'You joined the waitlist.' : 'You are registered.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };
  const share = async () => {
    await Share.share({ title: event.title, message: `${event.title}\n${event.date} · ${event.time}\n${event.venue}` });
  };
  const openMap = async () => {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`);
  };
  const toggleReminder = async () => {
    try {
      if (eventQuery.data.reminderEnabled) await apiDelete(`/events/${event.id}/reminders`);
      else await apiPost(`/events/${event.id}/reminders`);
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('event', id) });
      toast({ type: 'success', message: eventQuery.data.reminderEnabled ? 'Event reminder disabled.' : 'Event reminder enabled.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };
  const toggleBookmark = async () => {
    try {
      const next = !eventQuery.data.viewerBookmarked;
      await apiPost('/bookmarks', { targetType: 'event', targetId: event.id, bookmarked: next });
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('event', id) });
      toast({ type: 'success', message: next ? 'Event saved.' : 'Event removed from saved items.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };

  return <Screen><TopBar title="Event details" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/discover/events')} />} right={<IconButton icon="share-outline" label="Share event" onPress={() => void share()} />} /><View style={{ height: 210, backgroundColor: event.accent, borderRadius: 24, padding: 20, justifyContent: 'space-between' }}><Badge label={event.category} /><Ionicons name="sparkles" size={38} color="#344054" /><Text style={{ color: '#101828', fontSize: 29, lineHeight: 34, fontWeight: '900' }}>{event.title}</Text></View><View style={{ marginTop: 16 }}><Segmented values={['Details', 'Gallery'] as const} value={tab} onChange={setTab} /></View>{tab === 'Details' ? <><Card style={{ marginTop: 16 }}><View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><Avatar initials={event.title.slice(0, 2).toUpperCase()} accent={event.accent} /><View><Text style={{ color: p.ink, fontWeight: '800' }}>{event.organizer}</Text><Badge label="Official campus event" tone="success" icon="checkmark-circle" /></View></View><Body style={{ marginTop: 14 }}>{event.description}</Body></Card><Card style={{ marginTop: 12, gap: 13 }}>{[["calendar-outline", `${event.date} · ${event.time} ${event.timezone}`], ["location-outline", event.venue], ["people-outline", `${event.attendees} attending · ${event.capacity || 'No'} capacity`], ["hourglass-outline", `Register by ${event.deadline}`]].map(([icon, value]) => <View key={value} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={p.brand} /><Body>{value}</Body></View>)}</Card><View style={{ gap: 9, marginTop: 12 }}><View style={{ flexDirection: 'row', gap: 9 }}><View style={{ flex: 1 }}><Button variant="secondary" label="Directions" icon="navigate-outline" onPress={() => void openMap()} /></View><View style={{ flex: 1 }}><Button variant="secondary" label={eventQuery.data.viewerBookmarked ? 'Saved' : 'Save'} icon={eventQuery.data.viewerBookmarked ? 'bookmark' : 'bookmark-outline'} onPress={() => void toggleBookmark()} /></View></View><Button variant="secondary" label={eventQuery.data.reminderEnabled ? 'Reminder on' : 'Remind me'} icon={eventQuery.data.reminderEnabled ? 'notifications' : 'notifications-outline'} onPress={() => void toggleReminder()} /></View><Button label={registrationLabel} variant={event.registered || eventQuery.data.userRegistrationStatus === 'waitlisted' ? 'secondary' : 'primary'} onPress={() => void register()} /></> : null}{tab === 'Gallery' ? <View style={{ marginTop: 16 }}><StateView icon="images-outline" title={event.gallery.length ? 'Event media' : 'No event media'} detail={event.gallery.length ? `${event.gallery.length} approved media item(s).` : 'Approved event photos will appear here.'} /></View> : null}</Screen>;
}
