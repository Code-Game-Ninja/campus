import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, Field, IconButton, Screen, TopBar } from '@/components/ui';
import { askAssistant, type AssistantReply } from '@/lib/assistant';
import { apiPost } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import { getPet } from '@/data/pets';
import { PetFace, PetPicker } from '@/components/AIPet';

type Message = { id: string; mine: boolean; text: string; reply?: AssistantReply };
const starterQuestions = ['What events are next?', 'Help me find notes', 'How do I manage my post?'];

export default function Assistant() {
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const selectedPetId = useAppStore((s) => s.selectedPetId);
  const setSelectedPet = useAppStore((s) => s.setSelectedPet);
  const pet = getPet(selectedPetId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', mine: false, text: `Hi — I am ${pet.displayName}, your CampusSphere AI guide. Ask me anything about campus.` },
  ]);

  const ask = async (value = query) => {
    const clean = value.trim();
    if (!clean || loading) return;
    setMessages((items) => [...items, { id: `q-${Date.now()}`, mine: true, text: clean }]);
    setQuery('');
    setLoading(true);
    try {
      const reply = await askAssistant(clean);
      setMessages((items) => [...items, { id: `a-${Date.now()}`, mine: false, text: reply.answer, reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assistant unavailable. Try again.';
      toast({ type: 'error', message });
      setMessages((items) => [...items, { id: `a-${Date.now()}`, mine: false, text: message }]);
    } finally {
      setLoading(false);
    }
  };

  const reportAnswer = async (reply: AssistantReply) => {
    try {
      await apiPost('/reports', {
        targetType: 'assistant_response',
        targetId: reply.responseId,
        reason: 'unsafe',
        details: 'User reported an AI assistant response for moderation review.',
      });
      toast({ type: 'success', message: 'AI answer sent for safety review.' });
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Could not report answer.' });
    }
  };

  return <Screen>
    <TopBar title={`${pet.displayName} AI`} subtitle="Your campus conversation guide" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/home')} />} right={<IconButton icon="color-palette-outline" label="Change AI pet" onPress={() => setPickerOpen(true)} />} />
    <PetPicker visible={pickerOpen} current={pet} onClose={() => setPickerOpen(false)} onSelect={(next) => setSelectedPet(next.id)} />
    <View style={{ backgroundColor: pet.accent, borderRadius: 24, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <PetFace pet={pet} size={60} active={loading} />
      <View style={{ flex: 1 }}><Text style={{ color: '#101828', fontSize: 22, fontWeight: '900' }}>Talk to {pet.displayName}</Text><Text style={{ color: '#475467', fontSize: 12, lineHeight: 18, marginTop: 3 }}>Answers grounded in authorized campus sources.</Text></View>
      <Badge label="Online" tone="success" icon="radio" />
    </View>
    <View style={{ marginTop: 18, gap: 10 }}>
      {messages.map((message) => <View key={message.id} style={{ alignSelf: message.mine ? 'flex-end' : 'flex-start', maxWidth: '91%', gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
          {!message.mine ? <PetFace pet={pet} size={28} active={loading} /> : null}
          <View style={{ backgroundColor: message.mine ? p.brand : p.surface, borderWidth: message.mine ? 0 : 1, borderColor: p.line, borderRadius: 18, borderBottomRightRadius: message.mine ? 5 : 18, borderBottomLeftRadius: message.mine ? 18 : 5, paddingHorizontal: 13, paddingVertical: 10 }}><Text style={{ color: message.mine ? '#FFFFFF' : p.ink, fontSize: 14, lineHeight: 20 }}>{message.text}</Text></View>
        </View>
        {message.reply ? <View style={{ marginLeft: 35, gap: 7 }}>{message.reply.sources.map((source) => <Card key={source.id} onPress={() => router.push(source.openPath as never)} style={{ padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }}><Badge label="Source" tone="brand" /><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '800', fontSize: 12 }}>{source.title}</Text><Text style={{ color: p.muted, fontSize: 10, marginTop: 2 }}>{source.type} · server-authorized source</Text></View><Ionicons name="open-outline" size={16} color={p.brand} /></Card>)}<Button compact variant="ghost" label="Report this answer" icon="flag-outline" onPress={() => void reportAnswer(message.reply!)} /></View> : null}
      </View>)}
      {loading ? <View style={{ alignSelf: 'flex-start', backgroundColor: p.brandSoft, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 10, marginLeft: 35 }}><Text style={{ color: p.brand, fontWeight: '900', letterSpacing: 3 }}>•••</Text></View> : null}
    </View>
    {messages.length === 1 ? <View style={{ marginTop: 17 }}><Text style={{ color: p.muted, fontSize: 11, fontWeight: '800', marginBottom: 8 }}>TRY ASKING</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{starterQuestions.map((question) => <Pressable key={question} onPress={() => ask(question)} style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 }}><Text style={{ color: p.text, fontSize: 11, fontWeight: '700' }}>{question}</Text></Pressable>)}</View></View> : null}
    <View style={{ marginTop: 18, gap: 9 }}><Field label={`Message ${pet.displayName}`} value={query} onChangeText={setQuery} placeholder="Ask about events, notes, teams..." multiline /><Button label={`Send to ${pet.displayName}`} icon="arrow-up-circle" onPress={() => ask()} disabled={!query.trim()} loading={loading} /></View>
    <View style={{ backgroundColor: p.brandSoft, borderRadius: 14, padding: 13, marginTop: 16, flexDirection: 'row', gap: 9 }}><Ionicons name="shield-checkmark" size={19} color={p.brand} /><Body style={{ flex: 1 }}>{pet.displayName} can be incomplete. Open cited sources before acting on important information.</Body></View>
  </Screen>;
}
