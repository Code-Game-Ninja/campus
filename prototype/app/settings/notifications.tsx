import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Card, IconButton, Screen, StateView, ToggleRow, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { notificationLabel, updateNotificationPreference, type NotificationEventType, type NotificationPreferenceResponse } from '@/lib/notifications';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const eventTypes: NotificationEventType[] = ['post_reaction', 'comment', 'event_reminder', 'club_update', 'chat_message', 'security_alert'];

export default function NotificationSettings() {
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const query = useApiQuery<NotificationPreferenceResponse[]>(apiQueryKey('notification-preferences'), '/notifications/preferences');
  const [busy, setBusy] = useState<string | null>(null);
  const preferences = new Map((query.data ?? []).map((preference) => [preference.eventType, preference]));

  const toggle = async (eventType: NotificationEventType, key: 'inApp' | 'push' | 'emailDigest', value: boolean) => {
    if (eventType === 'security_alert') return;
    const current = preferences.get(eventType);
    setBusy(`${eventType}:${key}`);
    try {
      await updateNotificationPreference({ eventType, inApp: key === 'inApp' ? value : current?.inApp, push: key === 'push' ? value : current?.push, emailDigest: key === 'emailDigest' ? value : current?.emailDigest });
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('notification-preferences') });
      toast({ type: 'success', message: `${notificationLabel(eventType)} preference updated.` });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally { setBusy(null); }
  };

  return <Screen><TopBar title="Notifications" subtitle="Choose channels by category" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} />
    {query.isError ? <StateView icon="cloud-offline" tone="danger" title="Preferences unavailable" detail={query.error.message} action="Retry" onAction={() => query.refetch()} /> : query.isLoading ? <StateView icon="hourglass-outline" title="Loading preferences" detail="Fetching your notification settings…" /> : <>
      <Card style={{ marginTop: 14, paddingHorizontal: 14 }}><View style={{ paddingVertical: 14 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>Quiet hours</Text><Body muted style={{ marginTop: 4 }}>Quiet-hour scheduling is not available on this server yet. No local toggle is saved.</Body></View><ToggleRow title="Pause non-security push" detail="Coming with the notification delivery scheduler." value={false} disabled onValueChange={() => {}} /></Card>
      {eventTypes.map((eventType) => { const preference: NotificationPreferenceResponse | undefined = preferences.get(eventType); const security = eventType === 'security_alert'; return <Card key={eventType} style={{ marginTop: 12, paddingHorizontal: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14, gap: 8 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900', flex: 1 }}>{notificationLabel(eventType)}</Text>{security ? <Badge label="Always on" tone="danger" icon="shield" /> : null}</View><ToggleRow title="In-app" value={preference?.inApp ?? true} disabled={security || busy === `${eventType}:inApp`} onValueChange={(value) => void toggle(eventType, 'inApp', value)} /><ToggleRow title="Push" value={preference?.push ?? true} disabled={security || busy === `${eventType}:push`} onValueChange={(value) => void toggle(eventType, 'push', value)} /><ToggleRow title="Email digest" value={preference?.emailDigest ?? true} disabled={security || busy === `${eventType}:emailDigest`} onValueChange={(value) => void toggle(eventType, 'emailDigest', value)} />{security ? <Body muted style={{ paddingBottom: 14 }}>Safety-critical notices cannot be disabled or silenced.</Body> : null}</Card>; })}
    </>}
  </Screen>;
}
