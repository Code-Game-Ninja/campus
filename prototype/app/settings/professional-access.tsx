import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Body, Button, Card, Field, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiDelete, apiPost } from '@/lib/api';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { activeOrganizerRequest, hasOrganizerAccess, type AccountRequest, type MeView } from '@/lib/account';
import { queryClient } from '@/lib/query';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

export default function ProfessionalAccess() {
  const p = usePalette();
  const toast = useAppStore((state) => state.showToast);
  const me = useApiQuery<MeView>(apiQueryKey('me'), '/me', {}, { staleTime: 5 * 60_000 });
  const requests = useApiQuery<AccountRequest[]>(apiQueryKey('account-requests'), '/account/requests');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const organizer = hasOrganizerAccess(me.data?.roles);
  const activeRequest = activeOrganizerRequest(requests.data);
  const previousRequest = requests.data?.find((request) => request.type === 'organizer_access');

  const submit = async () => {
    if (reason.trim().length < 10) {
      setError('Tell the campus team how you plan to organize events or a club.');
      return;
    }
    setBusy(true);
    try {
      await apiPost<AccountRequest>('/account/requests', { type: 'organizer_access', reason: reason.trim() });
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('account-requests') });
      setReason('');
      toast({ type: 'success', message: 'Organizer-access request sent for review.' });
    } catch (cause) {
      toast({ type: 'error', message: cause instanceof Error ? cause.message : 'Could not submit the request.' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!activeRequest || activeRequest.status !== 'pending') return;
    setBusy(true);
    try {
      await apiDelete(`/account/requests/${activeRequest.id}`);
      await queryClient.invalidateQueries({ queryKey: apiQueryKey('account-requests') });
      toast({ type: 'success', message: 'Organizer-access request cancelled.' });
    } catch (cause) {
      toast({ type: 'error', message: cause instanceof Error ? cause.message : 'Could not cancel the request.' });
    } finally {
      setBusy(false);
    }
  };

  if (me.isLoading || requests.isLoading) return <Screen><TopBar title="Organizer access" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} /><StateView icon="hourglass-outline" title="Checking access" detail="Reading your server role and request status…" /></Screen>;
  if (me.isError || requests.isError) return <Screen><TopBar title="Organizer access" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} /><StateView icon="cloud-offline" tone="danger" title="Access status unavailable" detail={(me.error ?? requests.error)?.message ?? 'Could not load access status.'} action="Retry" onAction={() => { void me.refetch(); void requests.refetch(); }} /></Screen>;

  return <Screen>
    <TopBar title="Organizer access" subtitle="Campus-reviewed permission" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/profile')} />} />
    {organizer ? <StateView icon="shield-checkmark" title="Organizer access approved" detail="Your server role is active. You can create and manage official campus events." action="Open organizer workspace" onAction={() => router.replace('/organizer')} /> : activeRequest ? <Card style={{ marginTop: 18 }}>
      <Badge label={activeRequest.status === 'processing' ? 'Under review' : 'Request received'} tone="warning" icon="time-outline" />
      <Text style={{ color: p.ink, fontSize: 22, fontWeight: '900', marginTop: 14 }}>Your request is {activeRequest.status}</Text>
      <Body muted style={{ marginTop: 7 }}>The campus team must approve and grant a server role before organizer tools become available.</Body>
      {activeRequest.reason ? <View style={{ backgroundColor: p.sunken, borderRadius: 12, padding: 12, marginTop: 15 }}><Text style={{ color: p.muted, fontSize: 11, fontWeight: '800' }}>YOUR REQUEST</Text><Body style={{ marginTop: 5 }}>{activeRequest.reason}</Body></View> : null}
      {activeRequest.status === 'pending' ? <View style={{ marginTop: 16 }}><Button variant="ghost" label="Cancel request" loading={busy} onPress={() => void cancel()} /></View> : null}
    </Card> : <>
      <Card style={{ marginTop: 18, backgroundColor: p.brandSoft }}>
        <Badge label="Approval required" tone="brand" icon="shield-outline" />
        <Text style={{ color: p.ink, fontSize: 22, fontWeight: '900', marginTop: 13 }}>Request organizer access</Text>
        <Body muted style={{ marginTop: 7 }}>Apply only if you manage a club, student organization, or official campus event. Submitting a request does not unlock tools automatically.</Body>
      </Card>
      {previousRequest?.status === 'rejected' ? <View style={{ marginTop: 14 }}><Badge label="Previous request was not approved" tone="danger" /></View> : null}
      <View style={{ marginTop: 18, gap: 14 }}>
        <Field label="Why do you need organizer access?" value={reason} onChangeText={(value) => { setReason(value.slice(0, 500)); setError(''); }} placeholder="Describe your club, role, or planned event…" multiline error={error} />
        <Button label="Send request for review" icon="paper-plane-outline" loading={busy} disabled={busy} onPress={() => void submit()} />
      </View>
    </>}
  </Screen>;
}
