import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Field } from '@/components/ui';
import { sendOtp } from '@/lib/auth';

export default function Welcome() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setSubmitting(true);
    try { await sendOtp(email); router.push({ pathname: '/(auth)/verify', params: { email } }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not send code'); }
    finally { setSubmitting(false); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#DCE7FF' }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22, paddingTop: 70 }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
    <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#FDE5F1', right: -70, top: 120 }} />
    <View style={{ flex: 1 }}>
      <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="planet" size={30} color="#375DFB" /></View>
      <Text style={{ color: '#101828', fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -1.6, marginTop: 24 }}>Your campus,{`\n`}all in one sphere.</Text>
      <Text style={{ color: '#475467', fontSize: 16, lineHeight: 24, marginTop: 13, maxWidth: 330 }}>Discover people, communities, opportunities and ideas without the noise.</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>{['people', 'calendar', 'chatbubbles'].map((icon, index) => <View key={icon} style={{ flex: 1, height: 76, borderRadius: 18, backgroundColor: ['#FFFFFFAA', '#FFF8EAAA', '#F4EDFFAA'][index], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={25} color="#344054" /></View>)}</View>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, gap: 14 }}>
      <Field label="Email address" placeholder="you@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} error={error} />
      <Button label="Send verification code" icon="arrow-forward" onPress={submit} loading={submitting} />
      <Text style={{ color: '#667085', fontSize: 11, lineHeight: 16, textAlign: 'center' }}>A one-time code is sent through the configured Supabase Auth project.</Text>
    </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
