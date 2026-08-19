import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';
import { supabaseRequest } from './supabase-http';
import type { AuthSession } from './auth';

const INSTALLATION_ID_KEY = 'campussphere.push.installation-id';
const CLAIMED_DEVICE_KEY = 'campussphere.device.claimed-id';

export type DeviceClaimResult = { status: 'claimed' | 'skipped'; deviceId?: string };

export async function getInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const created = createUuid();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}

export async function claimDeviceForSession(session: AuthSession): Promise<DeviceClaimResult> {
  if (Platform.OS === 'web') return { status: 'skipped' };
  const installationId = await getInstallationId();
  const androidId = Platform.OS === 'android' ? await Application.getAndroidId() : null;
  const fingerprintSource = [
    Platform.OS,
    androidId || installationId,
    Application.applicationId || 'campussphere',
  ].join(':');
  const body = {
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other',
    deviceFingerprint: await fingerprintHash(fingerprintSource),
    installationIdHash: await fingerprintHash(installationId),
    deviceLabel: Device.modelName || Application.applicationName || 'CampusSphere device',
    model: Device.modelName || null,
    appVersion: Application.nativeApplicationVersion || null,
    integrityVerdict: 'not_checked',
  };
  if (API_BASE_URL.startsWith('supabase://')) {
    const result = await supabaseRequest<{ id?: string }>('rest', 'rpc/claim_device_mobile', {
      method: 'POST',
      accessToken: session.access_token,
      body: {
        p_platform: body.platform,
        p_device_fingerprint_hash: body.deviceFingerprint,
        p_device_public_key: null,
        p_installation_id_hash: body.installationIdHash,
        p_device_label: body.deviceLabel,
        p_integrity_verdict: body.integrityVerdict,
        p_app_version: body.appVersion,
        p_model: body.model,
        p_ip_address: null,
      },
    });
    if (result?.id) await SecureStore.setItemAsync(CLAIMED_DEVICE_KEY, String(result.id));
    return { status: 'claimed', deviceId: result?.id };
  }
  const response = await fetch(`${API_BASE_URL}/v1/mobile/device/claim`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  let payload: any = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'This device cannot be linked to the account.';
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = payload?.error?.code || 'DEVICE_CLAIM_FAILED';
    throw error;
  }
  if (payload?.deviceId) await SecureStore.setItemAsync(CLAIMED_DEVICE_KEY, String(payload.deviceId));
  return { status: 'claimed', deviceId: payload?.deviceId };
}

export async function getClaimedDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAIMED_DEVICE_KEY);
}

async function fingerprintHash(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
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
