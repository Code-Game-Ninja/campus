import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Body, Button, Chip, Field, IconButton, Screen, TopBar } from '@/components/ui';
import { apiPost, type ApiError } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { ApiListing, ListingType } from '@/lib/marketplace';
import { useAppStore } from '@/store/useAppStore';
import { usePalette } from '@/theme/usePalette';

const types: readonly ListingType[] = ['marketplace', 'lost', 'found'];
const labelFor = (type: ListingType) => type === 'marketplace' ? 'Marketplace' : type === 'lost' ? 'Lost' : 'Found';
export default function NewListing() {
  const params = useLocalSearchParams<{ type?: string }>(); const p = usePalette(); const toast = useAppStore((s) => s.showToast);
  const [type, setType] = useState<ListingType>(types.includes(params.type as ListingType) ? params.type as ListingType : 'marketplace'); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [location, setLocation] = useState('Main campus public area'); const [price, setPrice] = useState(''); const [contact, setContact] = useState('');
  const idempotencyKey = useRef(`listing-create-${Date.now()}`).current;
  const create = useMutation<ApiListing, ApiError, Record<string, unknown>>({ mutationFn: (body) => apiPost<ApiListing>('/listings', body, idempotencyKey), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['api', 'listings'] }); toast({ type: 'success', message: 'Listing published.' }); router.replace('/discover/listings'); }, onError: (error) => toast({ type: 'error', message: error.message }) });
  const submit = () => { if (!title.trim() || !description.trim() || (type === 'marketplace' && !price)) return; create.mutate({ type, title: title.trim(), description: description.trim(), locationText: location.trim(), contactChannel: contact.trim() || undefined, ...(type === 'marketplace' ? { priceMinor: Math.round(Number(price) * 100), currency: 'INR', condition: 'Good' } : {}) }); };
  return <Screen><TopBar title="Create listing" left={<IconButton icon="close" label="Close" onPress={() => goBackOrReplace('/discover/listings')} />} /><Text style={{ color: p.text, fontSize: 13, fontWeight: '800', marginTop: 14, marginBottom: 10 }}>LISTING TYPE</Text><View style={{ flexDirection: 'row', gap: 8 }}>{types.map((item) => <Chip key={item} label={labelFor(item)} selected={type === item} onPress={() => setType(item)} />)}</View><View style={{ gap: 16, marginTop: 20 }}><Field label="Title" value={title} onChangeText={setTitle} placeholder="What should people recognize?" /><Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="Add useful details without personal contact information" />{type === 'marketplace' ? <Field label="Price (INR)" value={price} onChangeText={(value) => setPrice(value.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="0" /> : null}<Field label={type === 'marketplace' ? 'Safe meet-up area' : 'Approximate location'} value={location} onChangeText={setLocation} /><Field label="Private contact channel (optional)" value={contact} onChangeText={setContact} placeholder="Only revealed after owner accepts a request" /><Body muted>{type === 'marketplace' ? 'No checkout or payment controls are created.' : 'Exact location remains protected by the server contact flow.'}</Body><Button label="Publish listing" onPress={submit} loading={create.isPending} disabled={!title.trim() || !description.trim() || (type === 'marketplace' && !price)} /></View></Screen>;
}
