import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiDelete, apiPost } from './api';

const INSTALLATION_ID_KEY = 'campussphere.push.installation-id';

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
  const installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (!installationId) return;
  await apiDelete(`/notifications/devices/${installationId}`);
}

async function getInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const created = createUuid();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}

function createUuid(): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
