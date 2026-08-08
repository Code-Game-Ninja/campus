import { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Body, Button, Card, Chip, Field, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { goBackOrReplace } from '@/lib/navigation';
import { apiQueryKey } from '@/lib/api-hooks';
import { queryClient } from '@/lib/query';
import { MAX_RESOURCE_BYTES, pickStudyDocument, type PickedStudyDocument } from '@/lib/document-picker';
import { completeUploadIntent, createUploadIntent, uploadToIntent, type ResourceType, type UploadStage } from '@/lib/uploads';
import { usePalette } from '@/theme/usePalette';
import { useAppStore } from '@/store/useAppStore';

const TYPES: ReadonlyArray<{ value: ResourceType; label: string }> = [
  { value: 'notes', label: 'Notes' },
  { value: 'past_paper', label: 'Past paper' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'lab_manual', label: 'Lab manual' },
  { value: 'presentation', label: 'Presentation' },
];

const STAGE_LABELS: Record<UploadStage, string> = {
  intent: 'Preparing secure upload…',
  storage: 'Uploading document…',
  complete: 'Finishing upload…',
};

function readableBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 200);
}

export default function UploadNotes() {
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const [file, setFile] = useState<PickedStudyDocument | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ResourceType>('notes');
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{ resourceId: string; bytes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const chooseFile = async () => {
    setError(null);
    try {
      const picked = await pickStudyDocument();
      if (!picked) return;
      setFile(picked);
      if (!title.trim()) setTitle(titleFromFile(picked.name));
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const submit = async () => {
    const cleanTitle = title.trim();
    if (!file) {
      setError('Choose a document first.');
      return;
    }
    if (!cleanTitle) {
      setError('Add a title for this material.');
      return;
    }

    setError(null);
    setStage('intent');
    try {
      if (pendingCompletion) {
        setStage('complete');
        await completeUploadIntent(pendingCompletion.resourceId, pendingCompletion.bytes);
        setPendingCompletion(null);
        await queryClient.invalidateQueries({ queryKey: apiQueryKey('my-content', 'materials') });
        setSubmitted(true);
        toast({ type: 'success', message: 'Material uploaded. It will appear in Notes when processing finishes.' });
        return;
      }

      let data: Blob;
      if (file.blob) {
        data = file.blob;
      } else {
        const response = await fetch(file.uri);
        if (!response.ok) throw new Error('Could not read the selected document.');
        data = await response.blob();
      }
      const actualBytes = data.size > 0 ? data.size : file.size;
      if (actualBytes > MAX_RESOURCE_BYTES) throw new Error('File is larger than the 50 MB upload limit.');
      const intent = await createUploadIntent({
        title: cleanTitle,
        description: description.trim() || undefined,
        type,
        mimeType: file.mimeType,
        bytes: actualBytes,
      });
      setStage('storage');
      await uploadToIntent(intent, file.mimeType, data);
      setPendingCompletion({ resourceId: intent.resourceId, bytes: actualBytes });
      setStage('complete');
      await completeUploadIntent(intent.resourceId, actualBytes);
      setPendingCompletion(null);
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('my-content', 'materials') });
      setSubmitted(true);
      toast({ type: 'success', message: 'Material uploaded. It will appear in Notes when processing finishes.' });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setStage(null);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setType('notes');
    setPendingCompletion(null);
    setError(null);
    setSubmitted(false);
  };

  if (submitted) {
    return <Screen><TopBar title="Share material" subtitle="Upload received" left={<IconButton icon="close" label="Close" onPress={() => router.replace('/discover/notes')} />} /><StateView icon="cloud-done-outline" title="Upload complete" detail="Your material is being processed and will appear in Notes when it is ready." /><View style={{ gap: 10 }}><Button label="Back to notes" icon="arrow-back" onPress={() => router.replace('/discover/notes')} /><Button variant="ghost" label="Upload another" icon="add-circle-outline" onPress={reset} /></View></Screen>;
  }

  return <Screen><TopBar title="Share material" subtitle="Upload study material" left={<IconButton icon="close" label="Close" onPress={() => goBackOrReplace('/discover/notes')} />} /><Card style={{ marginTop: 8 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: p.brandSoft }}><Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={24} color={p.brand} /></View><View style={{ flex: 1 }}><Text style={{ color: p.ink, fontWeight: '900', fontSize: 16 }}>{file?.name ?? 'Choose a study document'}</Text><Body muted style={{ marginTop: 3 }}>{file ? `${readableBytes(file.size)} · ${file.name.split('.').pop()?.toUpperCase()}` : 'PDF, DOCX, PPTX, or TXT · maximum 50 MB'}</Body></View></View><View style={{ marginTop: 14 }}><Button variant="secondary" label={file ? 'Choose another file' : 'Choose document'} icon="document-attach-outline" disabled={Boolean(stage) || Boolean(pendingCompletion)} onPress={() => void chooseFile()} /></View></Card><View style={{ gap: 16, marginTop: 18 }}><Field label="Title" value={title} onChangeText={setTitle} placeholder="Example: Data Structures Unit 2" error={!title.trim() && error?.includes('title') ? error : undefined} /><Field label="Description (optional)" value={description} onChangeText={setDescription} placeholder="What course or topic does this cover?" multiline /><View style={{ gap: 8 }}><Text style={{ color: p.text, fontSize: 13, fontWeight: '700' }}>Material type</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{TYPES.map((item) => <Chip key={item.value} label={item.label} selected={type === item.value} onPress={() => setType(item.value)} />)}</View></View></View><View style={{ backgroundColor: p.infoSoft, borderRadius: 16, padding: 14, marginTop: 18, flexDirection: 'row', gap: 10 }}><Ionicons name="information-circle-outline" size={21} color={p.brand} /><Body style={{ flex: 1 }}>Your material is checked for file integrity before it becomes available. If someone reports it, it is removed immediately and you are notified.</Body></View>{error ? <View style={{ backgroundColor: p.dangerSoft, borderRadius: 14, padding: 13, marginTop: 14 }}><Text style={{ color: p.danger, fontWeight: '800' }}>{error}</Text>{pendingCompletion ? <Body style={{ marginTop: 5 }}>File reached storage. Retry final submission; it will not upload twice.</Body> : null}</View> : null}<View style={{ marginTop: 18, gap: 8 }}><Button label={stage ? STAGE_LABELS[stage] : pendingCompletion ? 'Retry final submission' : 'Upload material'} icon="cloud-upload-outline" loading={Boolean(stage)} disabled={!file || !title.trim()} onPress={() => void submit()} /><Body muted style={{ textAlign: 'center' }}>Keep this screen open until upload completes.</Body></View></Screen>;
}
