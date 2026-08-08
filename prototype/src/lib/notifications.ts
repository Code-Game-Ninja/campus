import { apiGet, apiPatch } from './api';

export type NotificationEventType = 'post_reaction' | 'comment' | 'event_reminder' | 'club_update' | 'chat_message' | 'security_alert';
export interface NotificationPreferenceResponse { id: string; campusId: string; userId: string; eventType: NotificationEventType; inApp: boolean; push: boolean; emailDigest: boolean; updatedAt: string }
export interface NotificationResponse { id: string; campusId: string; recipientId: string; eventType: NotificationEventType; title: string; body: string; read: boolean; referenceType: string | null; referenceId: string | null; createdAt: string }

export async function getNotifications(unreadOnly = false): Promise<NotificationResponse[]> {
  return apiGet<NotificationResponse[]>('/notifications', { unreadOnly: unreadOnly ? 'true' : undefined });
}

export async function markNotificationRead(id: string): Promise<NotificationResponse> {
  return apiPatch<NotificationResponse>(`/notifications/${id}/read`);
}

export async function getNotificationPreferences(): Promise<NotificationPreferenceResponse[]> {
  return apiGet<NotificationPreferenceResponse[]>('/notifications/preferences');
}

export async function updateNotificationPreference(input: {
  eventType: NotificationEventType;
  inApp?: boolean;
  push?: boolean;
  emailDigest?: boolean;
}): Promise<NotificationPreferenceResponse> {
  return apiPatch<NotificationPreferenceResponse>('/notifications/preferences', input);
}

export function notificationLabel(eventType: NotificationEventType): string {
  const labels: Record<NotificationEventType, string> = {
    post_reaction: 'Post reactions',
    comment: 'Comments',
    event_reminder: 'Event reminders',
    club_update: 'Club updates',
    chat_message: 'Messages',
    security_alert: 'Security & account',
  };
  return labels[eventType];
}

export function notificationIcon(eventType: NotificationEventType): 'chatbubble' | 'alarm' | 'people' | 'shield-checkmark' | 'heart' {
  if (eventType === 'event_reminder') return 'alarm';
  if (eventType === 'club_update') return 'people';
  if (eventType === 'security_alert') return 'shield-checkmark';
  if (eventType === 'post_reaction') return 'heart';
  return 'chatbubble';
}

export function notificationColor(eventType: NotificationEventType): string {
  if (eventType === 'event_reminder') return '#FFF0D8';
  if (eventType === 'club_update') return '#E8F8F0';
  if (eventType === 'security_alert') return '#FDE7E7';
  return '#E6F2FF';
}

export function relativeNotificationTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1_440)}d`;
}
