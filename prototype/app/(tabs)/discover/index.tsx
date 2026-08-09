import { Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Body, Card, GradientHero, Heading, IconButton, Screen, SearchField, SectionHeader } from '@/components/ui';
import { usePalette } from '@/theme/usePalette';
import { useState } from 'react';
import { openUnderConstruction } from '@/lib/navigation';

const categories = [
  { title: 'Events', detail: 'Discover campus events', icon: 'calendar', color: '#FFE0F0', route: '/discover/events' },
  { title: 'Notes', detail: 'Study resources', icon: 'document-text', color: '#E9E6FF', route: '/discover/notes' },
  { title: 'Clubs', detail: 'Under construction', icon: 'people', color: '#DDF7E8', feature: 'Clubs' },
  { title: 'Opportunities', detail: 'Under construction', icon: 'briefcase', color: '#FFF1C7', feature: 'Opportunities' },
  { title: 'Marketplace', detail: 'Under construction', icon: 'pricetag', color: '#DDEBFF', feature: 'Marketplace' },
  { title: 'Lost & Found', detail: 'Under construction', icon: 'search-circle', color: '#FFE8D9', feature: 'Lost & Found' },
  { title: 'Team Finder', detail: 'Build something', icon: 'git-network', color: '#E6F2FF', route: '/discover/tribe' },
  { title: 'Assistant', detail: 'Under construction', icon: 'sparkles', color: '#F1E8FF', feature: 'Campus Assistant' },
  { title: 'Saved', detail: 'Your collections', icon: 'bookmark', color: '#E8F8F0', route: '/settings/saved' },
] as const;

export default function Discover() {
  const p = usePalette(); const [search, setSearch] = useState('');
  return <Screen><View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, gap: 12 }}><View style={{ flex: 1 }}><Heading>Discover</Heading><Text style={{ color: p.muted, marginTop: 3 }}>Browse campus life by category</Text></View><IconButton icon="chatbubbles-outline" label="Open chat" onPress={() => router.push('/chat')} /></View><View style={{ marginTop: 18 }}><SearchField value={search} onChangeText={(v) => { setSearch(v); if (v.length > 2) router.push({ pathname: '/search', params: { q: v } }); }} /></View><View style={{ marginTop: 18 }}><GradientHero eyebrow="This week" title="Try something outside your usual circle" detail="Small events, useful resources and teams looking for one more perspective." colors={['#BFE8FF', '#F9DFB6', '#F6CFE4']} icon="compass" /></View><SectionHeader title="Browse categories" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{categories.map((item) => <Pressable key={item.title} onPress={() => 'route' in item ? router.push(item.route as never) : openUnderConstruction(item.feature)} style={({ pressed }) => ({ width: '48.2%', minHeight: 142, borderRadius: 18, backgroundColor: item.color, padding: 15, marginBottom: 12, justifyContent: 'space-between', opacity: pressed ? .76 : 1 })}><View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon} size={23} color="#344054" /></View><View><Text style={{ color: '#101828', fontSize: 17, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: '#475467', fontSize: 12, marginTop: 3 }}>{item.detail}</Text></View></Pressable>)}</View>
    <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: p.line, flexDirection: 'row', gap: 11 }}><Ionicons name="shield-checkmark" size={23} color={p.success} /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '800' }}>Safer by design</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>Report, block and mute controls remain one tap away across content surfaces.</Text></View></View>
    <SectionHeader title="About CampusSphere" />
    <Card onPress={() => router.push('/developers')} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: p.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="code-slash" size={22} color={p.brand} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: p.ink, fontSize: 16, fontWeight: '900' }}>Meet the developers</Text><Body muted style={{ marginTop: 3 }}>The team building CampusSphere.</Body></View>
      <Ionicons name="chevron-forward" size={19} color={p.muted} />
    </Card>
  </Screen>;
}
