import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { checkForAndroidUpdate } from '@/lib/app-updates';
import type { AvailableAppUpdate } from '@/lib/app-updates';
import { usePalette } from '@/theme/usePalette';

export function AppUpdatePrompt() {
  const palette = usePalette();
  const [update, setUpdate] = useState<AvailableAppUpdate | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const dismissedBuildRef = useRef<number | null>(null);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const available = await checkForAndroidUpdate();
      if (available && available.latestBuildNumber !== dismissedBuildRef.current) {
        setUpdate(available);
        setDownloadError(null);
      } else if (!available) {
        setUpdate(null);
      }
    } catch {
      // Update checks must never interrupt normal app startup when offline.
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void check();
    // A free Render service may still be waking during the first request.
    const coldStartRetry = setTimeout(() => void check(), 20_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      clearTimeout(coldStartRetry);
      subscription.remove();
    };
  }, [check]);

  const dismiss = () => {
    if (!update || update.required) return;
    dismissedBuildRef.current = update.latestBuildNumber;
    setUpdate(null);
  };

  const download = async () => {
    if (!update) return;
    setDownloadError(null);
    try {
      await Linking.openURL(update.downloadUrl);
    } catch {
      setDownloadError('Could not open the download. Check your connection and try again.');
    }
  };

  if (!update) return null;

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="fade"
      visible
      onRequestClose={dismiss}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(16,24,40,.68)' }}>
        <View style={{ backgroundColor: palette.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: palette.line }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.brandSoft }}>
            <Ionicons name="cloud-download-outline" size={29} color={palette.brand} />
          </View>
          <Text style={{ color: palette.ink, fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 18 }}>
            {update.required ? 'Update required' : 'Update available'}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 13, marginTop: 5 }}>
            CampusSphere {update.latestVersion} · build {update.latestBuildNumber}
          </Text>
          <Text style={{ color: palette.text, fontSize: 15, lineHeight: 22, marginTop: 14 }}>
            {update.message}
          </Text>
          {update.required ? (
            <Text style={{ color: palette.warning, fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 12 }}>
              This version is no longer supported. Download the new APK to continue.
            </Text>
          ) : null}
          {downloadError ? (
            <Text style={{ color: palette.danger, fontSize: 13, lineHeight: 19, marginTop: 12 }}>{downloadError}</Text>
          ) : null}
          <View style={{ gap: 10, marginTop: 22 }}>
            <Button label="Download update" icon="download-outline" onPress={() => void download()} />
            {!update.required ? <Button label="Later" variant="ghost" onPress={dismiss} /> : null}
          </View>
          <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 12 }}>
            Android will ask you to approve installation after the APK downloads.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
