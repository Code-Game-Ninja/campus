import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Button, Field, IconButton, Screen } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import { resolveOnboardingRoute, sendOtp, verifyOtp } from '@/lib/auth';

export default function Verify() {
  const p = usePalette();
  const { email } = useLocalSearchParams<{ email: string }>();
  const signIn = useAppStore((state) => state.signIn);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const verify = async () => {
    if (code.length !== 6) return;
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await verifyOtp(String(email ?? ''), code);
      const route = await resolveOnboardingRoute();
      signIn(route || 'university');
      router.replace(route === 'complete' ? '/(tabs)/home' : route === 'profile' ? '/(onboarding)/profile-setup' : '/(onboarding)/university');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification code invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || resending) return;
    setError('');
    setNotice('');
    setCode('');
    setResending(true);
    try {
      await sendOtp(String(email ?? ''));
      setNotice('A new verification code was sent.');
      setResendIn(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={{ paddingTop: 8 }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(auth)/welcome')} />
        <View style={{ marginTop: 34 }}>
          <Text style={{ color: p.ink, fontSize: 32, lineHeight: 38, fontWeight: '900' }}>Check your inbox</Text>
          <Text style={{ color: p.muted, fontSize: 15, lineHeight: 22, marginTop: 9 }}>We sent a six-digit code to {email || 'your email'}.</Text>
          <Text style={{ color: p.muted, fontSize: 13, lineHeight: 20, marginTop: 7 }}>It may take a minute to arrive. If you cannot find it, check your spam or junk folder.</Text>
        </View>
        <View style={{ marginTop: 28, gap: 16 }}>
          <Field
            label="Verification code"
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, '').slice(0, 6));
              setError('');
              setNotice('');
            }}
            placeholder="000000"
            keyboardType="numeric"
            error={error || undefined}
          />
          {notice ? <Text style={{ color: p.success, fontSize: 13, lineHeight: 18 }}>{notice}</Text> : null}
          <Button label="Verify and continue" onPress={verify} loading={loading} disabled={code.length !== 6 || resending} />
          <Button
            variant="ghost"
            label={resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            onPress={() => void resend()}
            loading={resending}
            disabled={loading || resending || resendIn > 0}
          />
        </View>
      </View>
    </Screen>
  );
}
