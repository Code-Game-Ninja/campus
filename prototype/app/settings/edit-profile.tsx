import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { goBackOrReplace } from '@/lib/navigation';
import { Avatar, Body, Button, Card, Chip, Field, IconButton, Screen, StateView, ToggleRow, TopBar } from '@/components/ui';
import { apiPatch } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { ProfileView } from '@/lib/discovery';
import { PROFILE_INTERESTS, PROFILE_SKILLS, toggleProfileValue } from '@/lib/profile-options';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

interface MeView { userId: string }

export default function EditProfile() {
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const me = useApiQuery<MeView>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const profile = useApiQuery<ProfileView>(apiQueryKey('profile', me.data?.userId), `/profiles/${me.data?.userId}`, {}, { enabled: Boolean(me.data?.userId) });
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [discoverable, setDiscoverable] = useState(false);
  const [showBioEditor, setShowBioEditor] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const value = profile.data;
    if (!value) return;
    setName(value.displayName ?? '');
    setBio(value.bio ?? '');
    setDepartment(value.department ?? '');
    setYear(value.studyYear ? String(value.studyYear) : '');
    setSkills(value.skills ?? []);
    setInterests(value.interests ?? []);
    setLinkLabel(value.links?.[0]?.label ?? '');
    setLinkUrl(value.links?.[0]?.url ?? '');
    setDiscoverable(Boolean(value.discoverable));
    setShowBioEditor(Boolean(value.bio));
    setShowLinkEditor(Boolean(value.links?.length));
  }, [profile.data]);

  const save = async () => {
    if (!me.data?.userId) return;
    const nextErrors: Record<string, string> = {};
    const numericYear = Number(year);
    if (name.trim().length < 2) nextErrors.name = 'Enter your full name';
    if (department.trim().length < 2) nextErrors.department = 'Enter your department';
    if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 12) nextErrors.year = 'Enter a year from 1 to 12';
    if (linkUrl.trim() && !/^https?:\/\/\S+$/i.test(linkUrl.trim())) nextErrors.linkUrl = 'Use a full link starting with http:// or https://';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const saved = await apiPatch<ProfileView>('/profiles/me', {
        displayName: name.trim(),
        bio: bio.trim(),
        department: department.trim(),
        studyYear: numericYear,
        skills,
        interests,
        links: linkUrl.trim() ? [{ label: linkLabel.trim() || 'Profile link', url: linkUrl.trim() }] : [],
        discoverable,
      });
      queryClient.setQueryData(apiQueryKey('profile', me.data.userId), saved);
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('recommendations') });
      toast({ type: 'success', message: 'Profile updated everywhere.' });
      goBackOrReplace('/(tabs)/profile');
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (me.isLoading || profile.isLoading) return <Screen><StateView icon="hourglass-outline" title="Loading profile" detail="Fetching editable fields…" /></Screen>;
  if (me.isError || profile.isError || !profile.data) return <Screen><StateView icon="cloud-offline" tone="danger" title="Profile unavailable" detail={(me.error ?? profile.error)?.message ?? 'Could not load profile'} action="Retry" onAction={() => { void me.refetch(); void profile.refetch(); }} /></Screen>;

  const initials = (name || 'Campus member').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const addOptionalDetail = (title: string, detail: string, onPress: () => void) => <Card onPress={onPress} style={{ padding: 14, backgroundColor: p.sunken }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={21} color={p.brand} /></View><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '800' }}>{title}</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{detail}</Text></View></View></Card>;

  return <Screen>
    <TopBar title="Edit profile" subtitle="Only details you save appear on your profile" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} />
    <Card style={{ marginTop: 12, backgroundColor: p.brandSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        {profile.data.avatarUrl ? <Image source={{ uri: profile.data.avatarUrl }} style={{ width: 68, height: 68, borderRadius: 34 }} /> : <Avatar initials={initials} size={68} accent={p.surface} />}
        <View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '900' }}>Your profile identity</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }}>{profile.data.avatarUrl ? 'Your saved profile photo is shown across CampusSphere.' : `${initials || 'CS'} is generated from your display name, so your avatar is never blank.`}</Text></View>
      </View>
    </Card>
    <View style={{ gap: 16, marginTop: 16 }}>
      <Field label="Display name" value={name} onChangeText={(value) => { setName(value); setErrors((current) => ({ ...current, name: '' })); }} placeholder="Your full name" error={errors.name} />
      <Field label="Department" value={department} onChangeText={(value) => { setDepartment(value); setErrors((current) => ({ ...current, department: '' })); }} placeholder="For example, Computer Science" error={errors.department} />
      <Field label="Academic year" value={year} onChangeText={(value) => { setYear(value.replace(/\D/g, '').slice(0, 2)); setErrors((current) => ({ ...current, year: '' })); }} placeholder="For example, 1" keyboardType="numeric" error={errors.year} />

      {showBioEditor ? <Field label="Bio (optional)" value={bio} onChangeText={(value) => setBio(value.slice(0, 500))} placeholder="What are you learning, building, or looking for?" multiline /> : addOptionalDetail('Add a bio', 'Not added yet. Share something only when you want to.', () => setShowBioEditor(true))}
      {showLinkEditor ? <><Field label="Link label (optional)" value={linkLabel} onChangeText={(value) => setLinkLabel(value.slice(0, 40))} placeholder="Portfolio, GitHub, LinkedIn…" /><Field label="Profile link (optional)" value={linkUrl} onChangeText={(value) => { setLinkUrl(value.slice(0, 300)); setErrors((current) => ({ ...current, linkUrl: '' })); }} placeholder="https://…" keyboardType="url" error={errors.linkUrl} /></> : addOptionalDetail('Add a profile link', 'Not added yet. Link a portfolio or account if it helps your profile.', () => setShowLinkEditor(true))}

      <View><Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginBottom: 10 }}>SKILLS (OPTIONAL)</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PROFILE_SKILLS.map((item) => <Chip key={item} label={item} selected={skills.includes(item)} onPress={() => setSkills(toggleProfileValue(skills, item))} />)}</View></View>
      <View><Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginBottom: 10 }}>INTERESTS (OPTIONAL)</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PROFILE_INTERESTS.map((item) => <Chip key={item} label={item} selected={interests.includes(item)} onPress={() => setInterests(toggleProfileValue(interests, item))} />)}</View></View>
      <View style={{ backgroundColor: p.surface, borderRadius: 16, borderWidth: 1, borderColor: p.line, paddingHorizontal: 14 }}><ToggleRow title="Show me in Team Finder" detail="Recommendations use exactly the skills and interests saved here." value={discoverable} onValueChange={setDiscoverable} /></View>
      <Body muted>Optional details remain hidden when you leave them empty. Nothing is invented or prefilled for you.</Body>
      <Button label="Save profile" loading={saving} onPress={() => void save()} disabled={saving} />
    </View>
  </Screen>;
}
