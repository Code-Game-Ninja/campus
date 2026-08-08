import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Body, Button, Chip, Field, IconButton, Screen, Segmented, TopBar } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import { apiPost } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { Scope } from '@/types';

const kinds = ['discussion', 'announcement', 'achievement', 'meme'] as const;

export default function Compose() {
  const p = usePalette();
  const showToast = useAppStore((s) => s.showToast);
  const [kind, setKind] = useState<(typeof kinds)[number]>('discussion');
  const [scope, setScope] = useState<Scope>('campus');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await apiPost('/posts', {
        title: title.trim() || undefined,
        body: body.trim(),
        scope,
        kind,
        visibility: scope === 'campus' ? 'campus' : 'public',
      });
      showToast({ type: 'success', message: 'Post published.' });
      router.replace('/(tabs)/home');
      void queryClient.invalidateQueries({ queryKey: ['api', 'feed'] });
    } catch (error) {
      showToast({ type: 'error', message: (error as Error).message });
    } finally {
      setPosting(false);
    }
  };

  return <Screen>
    <TopBar title="Create post" subtitle="Published securely through CampusSphere API" left={<IconButton icon="close" label="Close" onPress={() => goBackOrReplace('/(tabs)/home')} />} />
    <View style={{ gap: 20, marginTop: 12 }}>
      <View><Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginBottom: 10 }}>POST TYPE</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{kinds.map((value) => <Chip key={value} label={value[0].toUpperCase() + value.slice(1)} selected={kind === value} onPress={() => setKind(value)} />)}</View></View>
      <View><Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginBottom: 10 }}>WHO CAN SEE THIS?</Text><Segmented values={['campus', 'global'] as const} value={scope} onChange={setScope} /><Body muted style={{ marginTop: 7 }}>{scope === 'campus' ? 'Visible only to members of your campus.' : 'Visible across campuses. Global scope is always an explicit choice.'}</Body></View>
      <Field label="Title (optional)" value={title} onChangeText={setTitle} placeholder="Give the post a clear title" />
      <Field label="Post" value={body} onChangeText={(value) => setBody(value.slice(0, 800))} placeholder="Share something useful, ask a question, or start a discussion…" multiline />
      <Text style={{ color: p.muted, fontSize: 11, textAlign: 'right', marginTop: -14 }}>{body.length}/800</Text>
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 15, padding: 14 }}><Button variant="ghost" icon="images-outline" label="Post photos under construction · stay tuned" disabled onPress={() => undefined} /><Body muted style={{ marginTop: 8 }}>Text posts are live. Photo uploads remain disabled until picker, storage, scanner, and moderation checks pass together.</Body></View>
      <View style={{ backgroundColor: p.brandSoft, padding: 13, borderRadius: 13 }}><Body>Be specific, respect privacy, and use overflow menu to report unsafe content.</Body></View>
      <Button label="Publish post" icon="send" onPress={submit} disabled={!body.trim()} loading={posting} />
    </View>
  </Screen>;
}
