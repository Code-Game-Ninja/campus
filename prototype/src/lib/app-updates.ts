import * as Application from 'expo-application';
import { apiGet } from '@/lib/api';

export interface AndroidAppUpdateManifest {
  platform: 'android';
  enabled: boolean;
  latestVersion: string | null;
  latestBuildNumber: number | null;
  minimumBuildNumber: number | null;
  downloadUrl: string | null;
  message: string;
  publishedAt: string | null;
}

export interface AvailableAppUpdate extends AndroidAppUpdateManifest {
  latestVersion: string;
  latestBuildNumber: number;
  minimumBuildNumber: number;
  downloadUrl: string;
  currentVersion: string;
  currentBuildNumber: number;
  required: boolean;
}

function parseBuildNumber(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function evaluateAndroidUpdate(
  manifest: AndroidAppUpdateManifest,
  nativeBuildVersion = Application.nativeBuildVersion,
  nativeApplicationVersion = Application.nativeApplicationVersion,
): AvailableAppUpdate | null {
  const currentBuildNumber = parseBuildNumber(nativeBuildVersion);
  const latestBuildNumber = manifest.latestBuildNumber;
  const minimumBuildNumber = manifest.minimumBuildNumber ?? 0;

  if (
    !manifest.enabled
    || currentBuildNumber === null
    || latestBuildNumber === null
    || !manifest.latestVersion
    || !manifest.downloadUrl
    || currentBuildNumber >= latestBuildNumber
  ) {
    return null;
  }

  return {
    ...manifest,
    latestVersion: manifest.latestVersion,
    latestBuildNumber,
    minimumBuildNumber,
    downloadUrl: manifest.downloadUrl,
    currentVersion: nativeApplicationVersion ?? 'unknown',
    currentBuildNumber,
    required: currentBuildNumber < minimumBuildNumber,
  };
}

export async function checkForAndroidUpdate(): Promise<AvailableAppUpdate | null> {
  const manifest = await apiGet<AndroidAppUpdateManifest>('/app-updates/android', {}, false);
  return evaluateAndroidUpdate(manifest);
}
