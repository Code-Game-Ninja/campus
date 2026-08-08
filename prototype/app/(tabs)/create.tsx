import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Body, Heading, Screen } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';

const actions = [
  { title: 'Create a post', detail: 'Discussion, announcement or achievement', icon: 'create', color: '#DCE7FF', route: '/compose' },
  { title: 'Share notes', detail: 'Upload a study resource for review', icon: 'document-attach', color: '#E9E6FF', route: '/discover/notes/upload' },
  { title: 'Create a team', detail: 'Publish a goal-focused team request', icon: 'people-circle', color: '#DDF7E8', route: '/discover/tribe/new-team' },
] as const;

export default function Create() {
  const p = usePalette();
  return <Screen><View style={{ paddingTop: 12 }}><Heading>Create</Heading><Body muted style={{ marginTop: 7 }}>Share something useful with your campus.</Body></View><View style={{ marginTop: 26, gap: 13 }}>{actions.map((item) => <Pressable key={item.title} onPress={() => router.push(item.route as never)} style={({ pressed }) => ({ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? .78 : 1 })}><View style={{ width: 58, height: 58, borderRadius: 17, backgroundColor: item.color, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon} size={28} color="#344054" /></View><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 17, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{item.detail}</Text></View><Ionicons name="chevron-forward" size={20} color={p.muted} /></Pressable>)}</View></Screen>;
}
