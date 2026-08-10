import { useEffect, useMemo, useState } from 'react';
import { AppState, KeyboardAvoidingView, Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Button, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiDelete, apiPatch, apiPost, apiPut, getChatAttachmentUrl, removeChatAttachment, uploadChatAttachment } from '@/lib/api';
import { apiQueryKey, useApiMutation, useApiQuery } from '@/lib/api-hooks';
import type { ChatAttachment, ChatMessage, ChatMessagePage, ChatRoom } from '@/lib/chat';
import { pickChatAttachment } from '@/lib/document-picker';
import { queryClient } from '@/lib/query';
import { subscribeToRoomMessages, type RealtimeStatus } from '@/lib/realtime-chat';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const toast = useAppStore((s) => s.showToast);
  const [text, setText] = useState('');
  const [muted, setMuted] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const messagesKey = apiQueryKey('chat-messages', id);

  const me = useApiQuery<{ userId: string }>(apiQueryKey('me'), '/me');
  const room = useApiQuery<ChatRoom>(apiQueryKey('chat-room', id), `/chat/rooms/${id}`, {}, { enabled: Boolean(id) });
  const messages = useApiQuery<ChatMessagePage>(
    messagesKey,
    `/chat/rooms/${id}/messages`,
    { limit: 100 },
    {
      enabled: Boolean(id),
      refetchInterval: realtimeStatus === 'connected' ? false : 12_000,
    },
  );

  useEffect(() => setMuted(Boolean(room.data?.muted)), [room.data?.muted]);

  useEffect(() => {
    const latest = messages.data?.items?.[0];
    if (!id || !latest || latest.id.startsWith('local-')) return;
    void apiPatch(`/chat/rooms/${id}/read`, { messageId: latest.id });
  }, [id, messages.data?.items?.[0]?.id]);

  const send = useApiMutation<
    ChatMessage,
    { content: string; clientMessageId: string; messageType: 'text' },
    { previous?: ChatMessagePage; optimisticId: string; content: string }
  >(`/chat/rooms/${id}/messages`, 'POST', {
    onMutate: async ({ content, clientMessageId }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<ChatMessagePage>(messagesKey);
      const optimisticId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        campusId: room.data?.campusId ?? '',
        roomId: id,
        senderId: me.data?.userId ?? '',
        content,
        clientMessageId,
        messageType: 'text',
        status: 'visible',
        createdAt: new Date().toISOString(),
        editedAt: null,
      };
      queryClient.setQueryData<ChatMessagePage>(messagesKey, {
        items: [optimistic, ...(previous?.items ?? [])],
        nextCursor: previous?.nextCursor ?? null,
      });
      setText('');
      return { previous, optimisticId, content };
    },
    onSuccess: (created, _variables, context) => {
      queryClient.setQueryData<ChatMessagePage>(messagesKey, (current) => ({
        items: (current?.items ?? []).map((message) => message.id === context?.optimisticId ? created : message),
        nextCursor: current?.nextCursor ?? null,
      }));
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('chat-rooms') });
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous);
      else queryClient.removeQueries({ queryKey: messagesKey });
      if (context?.content) setText(context.content);
      toast({ type: 'error', message: error.message });
    },
  });

  const toggleMute = async () => {
    try {
      if (muted) await apiDelete(`/chat/rooms/${id}/mute`);
      else await apiPut(`/chat/rooms/${id}/mute`, {});
      setMuted(!muted);
      toast({ type: 'success', message: muted ? 'Room unmuted.' : 'Room muted.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    }
  };

  const sendAttachment = async (): Promise<void> => {
    if (!id || !me.data?.userId || uploadingAttachment) return;
    setUploadingAttachment(true);
    let storageKey: string | null = null;
    let createdMessage: ChatMessage | null = null;
    try {
      const file = await pickChatAttachment();
      if (!file) return;
      storageKey = await uploadChatAttachment({
        roomId: id,
        userId: me.data.userId,
        name: file.name,
        mimeType: file.mimeType,
        uri: file.uri,
        blob: file.blob,
      });
      createdMessage = await apiPost<ChatMessage>(`/chat/rooms/${id}/messages`, {
        content: file.name,
        clientMessageId: `mobile-file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        messageType: 'file',
        metadata: { fileName: file.name, mimeType: file.mimeType, bytes: file.size },
      });
      const attachment = await apiPost<ChatAttachment>(`/chat/messages/${createdMessage.id}/attachments`, {
        storageKey,
        fileName: file.name,
        mimeType: file.mimeType,
        bytes: file.size,
      });
      queryClient.setQueryData<ChatMessagePage>(messagesKey, (current) => ({
        items: [{ ...createdMessage!, attachments: [attachment] }, ...(current?.items ?? []).filter((message) => message.id !== createdMessage?.id)],
        nextCursor: current?.nextCursor ?? null,
      }));
      void queryClient.invalidateQueries({ queryKey: apiQueryKey('chat-rooms') });
      toast({ type: 'success', message: 'Attachment sent.' });
    } catch (error) {
      if (createdMessage) await apiDelete(`/chat/messages/${createdMessage.id}`).catch(() => undefined);
      if (storageKey) await removeChatAttachment(storageKey).catch(() => undefined);
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const openAttachment = async (attachment: ChatAttachment): Promise<void> => {
    setOpeningAttachmentId(attachment.id);
    try {
      const url = await getChatAttachmentUrl(attachment.storageKey);
      await Linking.openURL(url);
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const reportRecent = async () => {
    const ids = (messages.data?.items ?? [])
      .filter((message) => !message.id.startsWith('local-') && message.senderId !== me.data?.userId)
      .slice(0, 10)
      .map((message) => message.id);
    if (!ids.length) {
      toast({ type: 'info', message: 'No visible messages from another participant to report.' });
      return;
    }
    setReporting(true);
    try {
      await apiPost('/chat/reports', { roomId: id, messageIds: ids, reason: 'other', details: 'Reported from main-app conversation screen.' });
      toast({ type: 'success', message: 'Recent visible messages submitted for moderation review.' });
    } catch (error) {
      toast({ type: 'error', message: (error as Error).message });
    } finally {
      setReporting(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const subscription = subscribeToRoomMessages(
      id,
      () => {
        void queryClient.invalidateQueries({ queryKey: messagesKey });
        void queryClient.invalidateQueries({ queryKey: apiQueryKey('chat-rooms') });
      },
      setRealtimeStatus,
    );
    subscription.setEnabled(AppState.currentState === 'active');
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      subscription.setEnabled(state === 'active');
    });
    return () => {
      appStateSubscription.remove();
      subscription.unsubscribe();
    };
  }, [id]);

  const counterpart = useMemo(
    () => room.data?.type === 'dm' ? room.data.members.find((member) => member.userId !== me.data?.userId) : undefined,
    [me.data?.userId, room.data],
  );
  const roomTitle = room.data?.name ?? counterpart?.displayName?.trim() ?? (room.data?.type === 'dm' ? 'Campus member' : 'Group chat');
  const namesByUserId = useMemo(
    () => new Map(room.data?.members.map((member) => [member.userId, member.displayName?.trim() || 'Campus member']) ?? []),
    [room.data?.members],
  );

  if (room.isLoading || messages.isLoading || me.isLoading) {
    return <Screen><StateView icon="hourglass-outline" title="Loading conversation" detail="Decrypting your authorized message history…" /></Screen>;
  }
  if (room.isError || messages.isError || me.isError) {
    const error = room.error ?? messages.error ?? me.error;
    return <Screen><StateView icon="lock-closed-outline" tone="danger" title="Messaging unavailable" detail={error?.message ?? 'Room unavailable.'} action="Go back" onAction={() => goBackOrReplace('/chat')} /></Screen>;
  }

  const ordered = [...(messages.data?.items ?? [])].reverse();
  const statusLabel = realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…';

  return (
    <Screen scroll={false} keyboardAvoiding={false}>
      <TopBar
        title={roomTitle}
        subtitle={`Private but reportable · ${statusLabel}`}
        left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/chat')} />}
        right={<IconButton icon={muted ? 'notifications-off' : 'notifications-outline'} label={muted ? 'Unmute room' : 'Mute room'} onPress={toggleMute} active={muted} />}
      />
      <View style={{ flex: 1, paddingVertical: 12 }}>
        {ordered.length ? ordered.map((message) => {
          const mine = message.senderId === me.data?.userId;
          const optimistic = message.id.startsWith('local-');
          return (
            <View key={message.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%', backgroundColor: mine ? p.brand : p.surface, borderWidth: mine ? 0 : 1, borderColor: p.line, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 8, opacity: optimistic ? 0.7 : 1 }}>
              {!mine && room.data?.type !== 'dm' ? <Text style={{ color: p.brand, fontSize: 11, fontWeight: '800', marginBottom: 3 }}>{namesByUserId.get(message.senderId) ?? 'Campus member'}</Text> : null}
              {message.attachments?.map((attachment) => (
                <Pressable key={attachment.id} accessibilityRole="button" accessibilityLabel={`Open ${attachment.fileName}`} onPress={() => void openAttachment(attachment)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, padding: 9, backgroundColor: mine ? 'rgba(255,255,255,0.15)' : p.sunken, opacity: pressed || openingAttachmentId === attachment.id ? 0.65 : 1 })}>
                  <Ionicons name={attachment.mimeType.startsWith('image/') ? 'image-outline' : 'document-attach-outline'} size={20} color={mine ? '#FFFFFF' : p.brand} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: mine ? '#FFFFFF' : p.ink, fontSize: 13, fontWeight: '800' }}>{attachment.fileName}</Text>
                    <Text style={{ color: mine ? '#DDE5FF' : p.muted, fontSize: 10 }}>{`${Math.max(1, Math.ceil(attachment.bytes / 1024))} KB · ${attachment.scanStatus}`}</Text>
                  </View>
                </Pressable>
              ))}
              {message.messageType !== 'file' || !message.attachments?.length ? <Text style={{ color: mine ? '#FFFFFF' : p.ink, fontSize: 15, lineHeight: 21 }}>{message.content ?? 'Message unavailable.'}</Text> : null}
              <Text style={{ color: mine ? '#DDE5FF' : p.muted, fontSize: 10, marginTop: 4, textAlign: 'right' }}>{optimistic ? 'Sending…' : `${new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${message.editedAt ? ' · edited' : ''}`}</Text>
            </View>
          );
        }) : <StateView icon="chatbubble-outline" title="No messages" detail="Start this authorized conversation below." />}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ borderTopWidth: 1, borderTopColor: p.line, paddingTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 9 }}>
          <Pressable accessibilityLabel="Attach file" accessibilityRole="button" disabled={uploadingAttachment || !me.data?.userId} onPress={() => void sendAttachment()} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, opacity: uploadingAttachment || pressed ? 0.55 : 1 })}>
            <Ionicons name={uploadingAttachment ? 'hourglass-outline' : 'attach'} size={21} color={p.brand} />
          </Pressable>
          <TextInput accessibilityLabel="Message" value={text} onChangeText={setText} multiline placeholder="Message…" placeholderTextColor={p.muted} style={{ flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 22, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, paddingHorizontal: 15, paddingVertical: 10, color: p.ink }} />
          <Pressable accessibilityLabel="Send message" disabled={!text.trim() || send.isPending || !me.data?.userId} onPress={() => send.mutate({ content: text.trim(), clientMessageId: `mobile-${Date.now()}-${Math.random().toString(16).slice(2)}`, messageType: 'text' })} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? p.brand : p.line, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
        <Button compact variant="ghost" label="Report recent visible messages" icon="flag-outline" loading={reporting} onPress={reportRecent} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
