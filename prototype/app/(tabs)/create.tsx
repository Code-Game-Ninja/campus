import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Body, Heading, Screen } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { usePalette } from '@/theme/usePalette';
import { openUnderConstruction } from '@/lib/navigation';

const actions = [
  { title: 'Create a post', detail: 'Discussion, announcement or achievement', icon: 'create', color: '#DCE7FF', route: '/compose' },
  { title: 'Share notes', detail: 'Upload a study resource for review', icon: 'document-attach', color: '#E9E6FF', route: '/discover/notes/upload' },
  { title: 'Create a team', detail: 'Publish a goal-focused team request', icon: 'people-circle', color: '#DDF7E8', route: '/discover/tribe/new-team' },
] as const;

export default function Create() {
  const p = usePalette();
  const me = useApiQuery<{ roles: Array<{ roleName: string }> }>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const organizer = Boolean(me.data?.roles.some((role) => role.roleName === 'club_admin' || role.roleName === 'campus_admin' || role.roleName === 'platform_admin'));
  const organizerActions = organizer ? [{ title: 'Create official event', detail: 'Under construction · stay tuned', icon: 'calendar', color: '#FFF1C7', route: '__event__' }] as const : [];
  const allActions = [...actions, ...organizerActions];
  return <Screen><View style={{ paddingTop: 12 }}><Heading>Create</Heading><Body muted style={{ marginTop: 7 }}>Choose a focused action.</Body></View><View style={{ marginTop: 26, gap: 13 }}>{allActions.map((item) => <Pressable key={item.title} onPress={() => item.route === '__event__' ? openUnderConstruction('Organizer tools') : router.push(item.route as never)} style={({ pressed }) => ({ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? .78 : 1 })}><View style={{ width: 58, height: 58, borderRadius: 17, backgroundColor: item.color, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon} size={28} color="#344054" /></View><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{item.detail}</Text></View><Ionicons name="chevron-forward" size={20} color={p.muted} /></Pressable>)}</View><Pressable onPress={() => organizer ? router.push('/organizer') : router.push('/settings/professional-access')} style={{ backgroundColor: p.brandSoft, borderRadius: 16, padding: 15, marginTop: 25, flexDirection: 'row', gap: 10 }}><Ionicons name="information-circle" size={21} color={p.brand} /><Body style={{ flex: 1 }}>{me.isError ? 'Organizer role status is unavailable.' : organizer ? 'Open your approved organizer workspace.' : 'Manage or request campus-reviewed organizer access.'}</Body></Pressable></Screen>;
}
