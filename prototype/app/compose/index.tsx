import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Body, Button, Chip, Field, IconButton, Screen, Segmented, TopBar } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';
import { apiPost, removePostMedia, uploadPostMedia } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { pickPostDocument, pickPostImage, type PickedPostMedia } from '@/lib/document-picker';
import { queryClient } from '@/lib/query';
import type { Scope } from '@/types';

const kinds = ['discussion', 'announcement', 'achievement', 'meme'] as const;

function firstHttpUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s<>()]+/i)?.[0]?.replace(/[.,!?;:)]+$/, '');
  if (!match) return null;
  try { return new URL(match).toString(); } catch { return null; }
}

export default function Compose() {
  const p = usePalette();
  const showToast = useAppStore((s) => s.showToast);
  const [kind, setKind] = useState<(typeof kinds)[number]>('discussion');
  const [scope, setScope] = useState<Scope>('campus');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [media, setMedia] = useState<PickedPostMedia[]>([]);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [pollCloses, setPollCloses] = useState('');
  const me = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me');

  const chooseImage = async (replaceIndex?: number): Promise<void> => {
    try {
      if (replaceIndex === undefined && media.length >= 5) throw new Error('A post can contain at most five uploaded files.');
      const picked = await pickPostImage();
      if (picked) setMedia((current) => replaceIndex === undefined ? [...current, picked] : current.map((item, index) => index === replaceIndex ? picked : item));
    } catch (error) {
      showToast({ type: 'error', message: (error as Error).message });
    }
  };

  const chooseDocument = async (): Promise<void> => {
    try {
      if (media.length >= 5) throw new Error('A post can contain at most five uploaded files.');
      const picked = await pickPostDocument();
      if (picked) setMedia((current) => [...current, picked]);
    } catch (error) {
      showToast({ type: 'error', message: (error as Error).message });
    }
  };

  const submit = async () => {
    if (!body.trim() || !me.data?.userId) return;
    setPosting(true);
    const uploadedKeys: string[] = [];
    try {
      const pollValues = pollOptions.map((option) => option.trim()).filter(Boolean);
      if (pollEnabled && pollValues.length < 2) throw new Error('Poll needs at least two options.');
      const uploadedMedia = [];
      for (const [index, file] of media.entries()) {
        const storageKey = await uploadPostMedia({ userId: me.data.userId, name: file.name, mimeType: file.mimeType, uri: file.uri, blob: file.blob });
        uploadedKeys.push(storageKey);
        uploadedMedia.push({ mediaType: file.mediaType, storageKey, mimeType: file.mimeType, byteSize: file.size, displayOrder: index, metadata: { fileName: file.name } });
      }
      const linkUrl = firstHttpUrl(body);
      if (linkUrl) {
        uploadedMedia.push({ mediaType: 'link', url: linkUrl, displayOrder: uploadedMedia.length, metadata: { title: new URL(linkUrl).hostname, description: 'Shared link' } });
      }
      await apiPost('/posts', {
        title: title.trim() || undefined,
        body: body.trim(),
        scope,
        kind,
        visibility: scope === 'campus' ? 'campus' : 'global',
        media: uploadedMedia,
        poll: pollEnabled ? {
          options: pollValues,
          allowsMultiple: pollMultiple,
          closesAt: pollCloses.trim() ? new Date(`${pollCloses.trim()}T23:59:59`).toISOString() : null,
        } : null,
      });
      showToast({ type: 'success', message: 'Post published.' });
      router.replace('/(tabs)/home');
      void queryClient.invalidateQueries({ queryKey: ['api', 'feed'] });
    } catch (error) {
      await Promise.all(uploadedKeys.map((storageKey) => removePostMedia(storageKey).catch(() => undefined)));
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
      <Field label="Post" value={body} onChangeText={(value) => setBody(value.slice(0, 2000))} placeholder="Share something useful, ask a question, or start a discussion…" multiline />
      <Text style={{ color: p.muted, fontSize: 11, textAlign: 'right', marginTop: -14 }}>{body.length}/2000</Text>
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 15, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button variant="ghost" icon="image-outline" label="Add photo" disabled={media.length >= 5 || posting} onPress={() => void chooseImage()} /></View><View style={{ flex: 1 }}><Button variant="ghost" icon="document-outline" label="Add PDF" disabled={media.length >= 5 || posting} onPress={() => void chooseDocument()} /></View></View>
        {media.map((file, index) => file.mediaType === 'image' ? <View key={`${file.uri}-${index}`} style={{ gap: 8 }}><Image source={{ uri: file.uri }} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 13, backgroundColor: p.brandSoft }} resizeMode="cover" /><View style={{ flexDirection: 'row', gap: 8 }}><Button compact variant="ghost" label="Edit crop" onPress={() => void chooseImage(index)} /><Button compact variant="ghost" label="Remove" onPress={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></View></View> : <View key={`${file.uri}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Ionicons name="document-text-outline" size={20} color={p.muted} /><Text numberOfLines={1} style={{ flex: 1, color: p.text, fontSize: 12, fontWeight: '700' }}>{file.name} · {Math.ceil(file.size / 1024)} KB</Text><Button compact variant="ghost" label="Remove" onPress={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></View>)}
        <Body muted>Up to five files. Photos use Instagram-style 4:5 crop preview. First URL in post becomes private link preview metadata.</Body>
      </View>
      <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 15, padding: 14, gap: 11 }}>
        <Button variant="ghost" icon="stats-chart-outline" label={pollEnabled ? 'Remove poll' : 'Add poll'} onPress={() => setPollEnabled((value) => !value)} />
        {pollEnabled ? <>
          {pollOptions.map((option, index) => <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><Field label={`Option ${index + 1}`} value={option} onChangeText={(value) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value.slice(0, 160) : item))} /></View>{pollOptions.length > 2 ? <Button compact variant="ghost" label="Remove" onPress={() => setPollOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} /> : null}</View>)}
          {pollOptions.length < 6 ? <Button compact variant="ghost" label="Add option" onPress={() => setPollOptions((current) => [...current, ''])} /> : null}
          <Chip label="Allow multiple choices" selected={pollMultiple} onPress={() => setPollMultiple((value) => !value)} />
          <Field label="Poll closes (optional YYYY-MM-DD)" value={pollCloses} onChangeText={setPollCloses} placeholder="2026-08-20" />
        </> : null}
      </View>
      <View style={{ backgroundColor: p.brandSoft, padding: 13, borderRadius: 13 }}><Body>Be specific, respect privacy, and use overflow menu to report unsafe content.</Body></View>
      <Button label="Publish post" icon="send" onPress={submit} disabled={!body.trim() || me.isLoading || !me.data?.userId} loading={posting} />
    </View>
  </Screen>;
}
