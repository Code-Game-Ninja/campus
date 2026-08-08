import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Body, Button, Card, Chip, IconButton, Screen, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import { apiPatch } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { ApiListingPage, ContactRequest, ListingType } from '@/lib/marketplace';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const types: readonly ListingType[] = ['marketplace', 'lost', 'found'];
export default function ListingRequests() {
  const p = usePalette(); const toast = useAppStore((s) => s.showToast); const [selectedId, setSelectedId] = useState<string | null>(null);
  const pages = types.map((type) => useApiQuery<ApiListingPage>(apiQueryKey('listings', type), '/listings', { type, limit: 100 }));
  const owned = pages.flatMap((query) => query.data?.items ?? []).filter((listing) => listing.isOwner);
  const requests = useApiQuery<ContactRequest[]>(apiQueryKey('listing-requests', selectedId), `/listings/${selectedId}/contact-requests`, {}, { enabled: Boolean(selectedId) });
  const answer = async (request: ContactRequest, decision: 'accept' | 'decline') => { try { await apiPatch(`/listings/${request.listingId}/contact-requests/${request.id}`, { decision }); await queryClient.invalidateQueries({ queryKey: apiQueryKey('listing-requests', selectedId) }); toast({ type: 'success', message: `Request ${decision === 'accept' ? 'accepted' : 'declined'}.` }); } catch (error) { toast({ type: 'error', message: (error as Error).message }); } };
  return <Screen><TopBar title="Contact requests" subtitle="Owners control contact access" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/discover/listings')} />} />{pages.some((query) => query.isError) ? <StateView icon="cloud-offline" tone="danger" title="Requests unavailable" detail="Could not load your listings." action="Retry" onAction={() => pages.forEach((query) => query.refetch())} /> : pages.some((query) => query.isLoading) ? <StateView icon="hourglass-outline" title="Loading requests" detail="Fetching your listings…" /> : owned.length === 0 ? <StateView icon="mail-open-outline" title="No owned listings" detail="Create a listing before managing contact requests." /> : <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>{owned.map((listing) => <Chip key={listing.id} label={listing.title} selected={selectedId === listing.id} onPress={() => setSelectedId(listing.id)} />)}</View>{!selectedId ? <StateView icon="hand-left-outline" title="Choose a listing" detail="Select one of your listings to load its contact requests." /> : requests.isLoading ? <StateView icon="hourglass-outline" title="Loading requests" detail="Fetching owner-authorized requests…" /> : requests.isError ? <StateView icon="cloud-offline" tone="danger" title="Requests unavailable" detail={requests.error.message} action="Retry" onAction={() => requests.refetch()} /> : requests.data?.length ? requests.data.map((request) => <Card key={request.id} style={{ marginTop: 12 }}><Text style={{ color: p.ink, fontWeight: '800' }}>Requester {request.requesterId.slice(0, 8)}</Text><Body muted style={{ marginTop: 5 }}>{request.message ?? 'No message provided.'}</Body><Body muted style={{ marginTop: 5 }}>State: {request.state}</Body>{request.state === 'pending' ? <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}><View style={{ flex: 1 }}><Button compact variant="ghost" label="Decline" onPress={() => answer(request, 'decline')} /></View><View style={{ flex: 1 }}><Button compact label="Accept" onPress={() => answer(request, 'accept')} /></View></View> : null}</Card>) : <StateView icon="mail-open-outline" title="No requests" detail="No contact requests exist for this listing." />}</>}</Screen>;
}
