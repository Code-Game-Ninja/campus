import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Chip, Field, Screen, ToggleRow } from '@/components/ui';
import { apiPatch } from '@/lib/api';
import { apiQueryKey } from '@/lib/api-hooks';
import type { ProfileView } from '@/lib/discovery';
import { PROFILE_INTERESTS, PROFILE_SKILLS, toggleProfileValue } from '@/lib/profile-options';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const titles = ['Tell us about you', 'Add optional details', 'Make discovery yours'];
const details = [
  'Use your real campus details. Nothing is filled in for you.',
  'A short bio and profile link help people understand what you do.',
  'Choose the same skills and interests that appear on your profile and in Team Finder.',
];

export default function ProfileSetup() {
  const p = usePalette();
  const finish = useAppStore((state) => state.finishOnboarding);
  const showToast = useAppStore((state) => state.showToast);
  const transition = useRef(new Animated.Value(1)).current;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [discoverable, setDiscoverable] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step, transition]);

  const validateIdentity = () => {
    const nextErrors: Record<string, string> = {};
    const numericYear = Number(year);
    if (name.trim().length < 2) nextErrors.name = 'Enter your full name';
    if (department.trim().length < 2) nextErrors.department = 'Enter your department';
    if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 12) nextErrors.year = 'Enter a year from 1 to 12';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateOptional = () => {
    const nextErrors: Record<string, string> = {};
    if (linkUrl.trim() && !/^https?:\/\/\S+$/i.test(linkUrl.trim())) nextErrors.linkUrl = 'Use a full link starting with http:// or https://';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = async () => {
    if (step === 0) {
      if (!validateIdentity()) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!validateOptional()) return;
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await apiPatch<ProfileView>('/profiles/me', {
        displayName: name.trim(),
        department: department.trim(),
        studyYear: Number(year),
        bio: bio.trim(),
        skills,
        interests,
        links: linkUrl.trim() ? [{ label: linkLabel.trim() || 'Profile link', url: linkUrl.trim() }] : [],
        discoverable,
      });
      queryClient.setQueryData(apiQueryKey('profile', saved.userId), saved);
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('recommendations') });
      finish();
      router.replace('/(tabs)/home');
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save your profile.' });
    } finally {
      setSubmitting(false);
    }
  };

  const animatedStyle = {
    opacity: transition,
    transform: [{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return <Screen>
    <View style={{ flexDirection: 'row', gap: 7, marginTop: 10 }}>
      {[0, 1, 2].map((value) => <View key={value} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: value <= step ? p.brand : p.line }} />)}
    </View>
    <Animated.View style={[{ marginTop: 32 }, animatedStyle]}>
      <Text style={{ color: p.ink, fontSize: 30, lineHeight: 36, fontWeight: '900' }}>{titles[step]}</Text>
      <Body muted style={{ marginTop: 8 }}>{details[step]}</Body>

      {step === 0 ? <View style={{ marginTop: 28, gap: 16 }}>
        <Field label="Full name" value={name} onChangeText={(value) => { setName(value); setErrors((current) => ({ ...current, name: '' })); }} placeholder="How should people know you?" error={errors.name} />
        <Field label="Department" value={department} onChangeText={(value) => { setDepartment(value); setErrors((current) => ({ ...current, department: '' })); }} placeholder="For example, Computer Science" error={errors.department} />
        <Field label="Academic year" value={year} onChangeText={(value) => { setYear(value.replace(/\D/g, '').slice(0, 2)); setErrors((current) => ({ ...current, year: '' })); }} placeholder="For example, 1" keyboardType="numeric" error={errors.year} />
      </View> : null}

      {step === 1 ? <View style={{ marginTop: 24, gap: 16 }}>
        <Field label="Bio (optional)" value={bio} onChangeText={(value) => setBio(value.slice(0, 500))} placeholder="What are you learning, building, or looking for?" multiline />
        <Field label="Link label (optional)" value={linkLabel} onChangeText={(value) => setLinkLabel(value.slice(0, 40))} placeholder="Portfolio, GitHub, LinkedIn…" />
        <Field label="Profile link (optional)" value={linkUrl} onChangeText={(value) => { setLinkUrl(value.slice(0, 300)); setErrors((current) => ({ ...current, linkUrl: '' })); }} placeholder="https://…" keyboardType="url" error={errors.linkUrl} />
      </View> : null}

      {step === 2 ? <View style={{ marginTop: 24 }}>
        <Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginBottom: 11 }}>SKILLS (OPTIONAL)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>{PROFILE_SKILLS.map((item) => <Chip key={item} label={item} selected={skills.includes(item)} onPress={() => setSkills(toggleProfileValue(skills, item))} />)}</View>
        <Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginTop: 24, marginBottom: 11 }}>INTERESTS (OPTIONAL)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>{PROFILE_INTERESTS.map((item) => <Chip key={item} label={item} selected={interests.includes(item)} onPress={() => setInterests(toggleProfileValue(interests, item))} />)}</View>
        <View style={{ backgroundColor: p.surface, borderRadius: 16, borderWidth: 1, borderColor: p.line, paddingHorizontal: 14, marginTop: 24 }}>
          <ToggleRow title="Let people discover me" detail="Off by default. Team Finder uses only the skills and interests you selected above." value={discoverable} onValueChange={setDiscoverable} />
        </View>
      </View> : null}
    </Animated.View>
    <View style={{ marginTop: 34, gap: 10 }}>
      <Button label={step === 2 ? 'Finish setup' : 'Continue'} onPress={() => void next()} loading={submitting} disabled={submitting} />
      {step > 0 ? <Button variant="ghost" label="Back" disabled={submitting} onPress={() => { setErrors({}); setStep(step - 1); }} /> : null}
    </View>
  </Screen>;
}
