import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, IconButton, SafetyMenu, Screen, StateView, TopBar } from '@/components/ui';
import { useApiQuery } from '@/lib/api-hooks';
import { apiGet, apiPost } from '@/lib/api';
import { apiQueryKey } from '@/lib/api-hooks';
import { mapResource, type ApiResource } from '@/lib/resources';
import { usePalette } from '@/theme/usePalette';
import { useAppStore } from '@/store/useAppStore';

interface ResourcePage { items: ApiResource[]; nextCursor: string | null }
interface DownloadResponse { downloadUrl: string; expiresAt: string }

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookmarkOverride, setBookmarkOverride] = useState<boolean | null>(null);
  const query = useApiQuery<ResourcePage>(apiQueryKey('resources', 'servable'), '/resources', { limit: 100 });
  const raw = query.data?.items.find((item) => item.id === id);
  const resource = raw ? mapResource(raw) : undefined;
  const bookmarks = useApiQuery<{ target_type: string; target_id: string }[]>(apiQueryKey('bookmarks'), '/bookmarks');
  if (query.isLoading) return <Screen><StateView icon="hourglass-outline" title="Loading material" detail="Fetching the study resource…" /></Screen>;
  if (query.isError) return <Screen><StateView icon="cloud-offline" tone="danger" title="Resource unavailable" detail={query.error.message} action="Retry" onAction={() => query.refetch()} /></Screen>;
  if (!resource) return <Screen><StateView icon="document-outline" title="Resource not available" detail="It may be under review, removed, or outside your campus scope." action="Go back" onAction={() => goBackOrReplace('/discover/notes')} /></Screen>;
  const openResource = async () => { setOpening(true); try { const result = await apiGet<DownloadResponse>(`/resources/${resource.id}/download`); await Linking.openURL(result.downloadUrl); } catch (error) { toast({ type: 'error', message: (error as Error).message }); } finally { setOpening(false); } };
  const serverBookmarked = (bookmarks.data ?? []).some((item) => item.target_type === 'resource' && item.target_id === resource.id);
  const bookmarked = bookmarkOverride ?? serverBookmarked;
  const toggleBookmark = async () => { const previous = bookmarked; setBookmarkOverride(!previous); setSaving(true); try { const result = await apiPost<{ bookmarked: boolean }>('/bookmarks', { targetType: 'resource', targetId: resource.id }); setBookmarkOverride(result.bookmarked); void bookmarks.refetch(); } catch (error) { setBookmarkOverride(previous); toast({ type: 'error', message: (error as Error).message }); } finally { setSaving(false); } };
  return <Screen><TopBar title="Material" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/discover/notes')} />} right={<SafetyMenu target="material" targetType="resource" targetId={resource.id} />} /><View style={{ height: 210, backgroundColor: resource.accent, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="document-text" size={62} color="#344054" /><Text style={{ color: '#344054', fontWeight: '800', marginTop: 12 }}>CAMPUS MATERIAL</Text></View><Text style={{ color: p.ink, fontSize: 25, lineHeight: 31, fontWeight: '900', marginTop: 18 }}>{resource.title}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><Badge label="Available" tone="success" icon="checkmark-circle" />{resource.rating > 0 ? <Badge label={`★ ${resource.rating}`} /> : null}</View><Card style={{ marginTop: 14 }}><Body>{resource.description}</Body><View style={{ height: 1, backgroundColor: p.line, marginVertical: 14 }} /><Text style={{ color: p.muted, fontSize: 11 }}>{resource.subject} · {resource.semester}</Text></Card><View style={{ gap: 10, marginTop: 16 }}><Button variant="secondary" label={bookmarked ? 'Remove bookmark' : 'Save material'} icon={bookmarked ? 'bookmark' : 'bookmark-outline'} onPress={toggleBookmark} loading={saving} /><Button label="Download signed copy" icon="download-outline" onPress={openResource} loading={opening} /></View></Screen>;
}
