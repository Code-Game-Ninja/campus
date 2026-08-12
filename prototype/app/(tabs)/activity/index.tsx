import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge, Body, Button, Card, Heading, Screen, SectionHeader, StateView } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { markNotificationRead, notificationColor, notificationIcon, relativeNotificationTime, type NotificationResponse } from '@/lib/notifications';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

function openReference(referenceType: string | null, referenceId: string | null) {
  if (!referenceId) return;
  const routes: Record<string, string> = {
    post: `/post/${referenceId}`,
    event: `/discover/events/${referenceId}`,
    resource: `/discover/notes/${referenceId}`,
    team_request: `/discover/tribe/team/${referenceId}`,
  };
  const route = referenceType ? routes[referenceType] : undefined;
  if (route) router.push(route as never);
}

export default function Activity() {
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const query = useApiQuery<NotificationResponse[]>(apiQueryKey('notifications'), '/notifications', {}, { refetchInterval: 30_000 });
  const activity = query.data ?? [];
  const unread = activity.filter((item) => !item.read).length;

  const markOne = async (id: string, referenceType: string | null, referenceId: string | null) => {
    try {
      if (activity.find((item) => item.id === id)?.read === false) {
        await markNotificationRead(id);
        await queryClient.invalidateQueries({ queryKey: apiQueryKey('notifications') });
      }
      openReference(referenceType, referenceId);
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };

  const markAll = async () => {
    try {
      await Promise.all(activity.filter((item) => !item.read).map((item) => markNotificationRead(item.id)));
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('notifications') });
      toast({ type: 'success', message: 'All notifications marked read.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };

  return <Screen>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10 }}>
      <View style={{ flex: 1 }}><Heading>Activity</Heading><Body muted>{unread ? `${unread} updates need your attention` : 'You are all caught up'}</Body></View>
      <Button compact variant="ghost" label="Preferences" onPress={() => router.push('/settings/notifications')} />
    </View>
    <SectionHeader title="Recent" action={unread ? 'Mark all read' : undefined} onAction={() => void markAll()} />
    {query.isError ? <StateView icon="cloud-offline" tone="danger" title="Activity unavailable" detail={query.error.message} action="Retry" onAction={() => query.refetch()} /> : query.isLoading ? <StateView icon="hourglass-outline" title="Loading activity" detail="Fetching your notifications…" /> : activity.length === 0 ? <StateView icon="notifications-outline" title="No activity yet" detail="Reactions, comments, reminders, and messages will appear here." /> : <Card style={{ padding: 0, overflow: 'hidden' }}>{activity.map((item, index) => <Pressable key={item.id} onPress={() => void markOne(item.id, item.referenceType, item.referenceId)} style={{ minHeight: 78, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: index === activity.length - 1 ? 0 : 1, borderBottomColor: p.line, backgroundColor: item.read ? p.surface : p.brandSoft }}>
      <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: notificationColor(item.eventType), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={notificationIcon(item.eventType)} size={22} color={item.eventType === 'security_alert' ? p.danger : p.text} /></View>
      <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Text style={{ color: p.ink, fontSize: 15, fontWeight: '800' }}>{item.title}</Text>{item.eventType === 'security_alert' ? <Badge label="Security" tone="danger" /> : null}</View><Text style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{item.body}</Text></View>
      <Text style={{ color: p.muted, fontSize: 11 }}>{relativeNotificationTime(item.createdAt)}</Text>
    </Pressable>)}</Card>}
    <View style={{ backgroundColor: p.warningSoft, borderRadius: 15, padding: 14, marginTop: 18, flexDirection: 'row', gap: 10 }}><Ionicons name="shield" size={21} color={p.warning} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '800' }}>Security notices stay on</Text><Text style={{ color: p.text, fontSize: 12, lineHeight: 18, marginTop: 3 }}>Account and safety notifications cannot be silenced.</Text></View></View>
  </Screen>;
}
