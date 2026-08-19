import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiDelete, apiPost } from './api';
import { getInstallationId } from './device-security';

export type PushRegistrationResult = 'registered' | 'permission-denied' | 'unsupported';

interface PushDeviceResponse {
  id: string;
  installationId: string;
  platform: 'android' | 'ios' | 'web';
  active: boolean;
  lastSeenAt: string;
}

/** Register the native FCM token only after an authenticated app session exists. */
export async function syncPushRegistration(): Promise<PushRegistrationResult> {
  // Expo Go removed Android remote-push support in SDK 53. Importing
  // expo-notifications inside Expo Go is enough to emit a red error overlay,
  // so detect that host before loading the native notification package.
  if (Platform.OS !== 'android' || !Device.isDevice || Constants.appOwnership === 'expo') {
    return 'unsupported';
  }

  const Notifications = await import('expo-notifications');

  await Notifications.setNotificationChannelAsync('default', {
    name: 'CampusSphere',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.status === 'undetermined'
    ? await Notifications.requestPermissionsAsync()
    : currentPermission;
  if (permission.status !== 'granted') return 'permission-denied';

  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data !== 'string' || token.data.length < 20) {
    throw new Error('Firebase did not return a valid Android push token.');
  }

  const installationId = await getInstallationId();
  await apiPost<PushDeviceResponse>('/notifications/devices', {
    installationId,
    platform: 'android',
    token: token.data,
  });
  return 'registered';
}

/** Revoke this installation before logout while the bearer token is still valid. */
export async function revokeCurrentPushDevice(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const installationId = await getInstallationId();
  await apiDelete(`/notifications/devices/${installationId}`);
}
