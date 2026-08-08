import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { Badge, Button, Card, Chip, IconButton, Screen, SearchField, SectionHeader, StateView, TopBar } from '@/components/ui';
import { apiQueryKey, useApiQuery } from '@/lib/api-hooks';
import type { ApiListing, ApiListingPage, ListingType } from '@/lib/marketplace';
import { usePalette } from '@/theme/usePalette';

const types: readonly ListingType[] = ['marketplace', 'lost', 'found'];
const labelFor = (type: ListingType) => type === 'marketplace' ? 'Marketplace' : type === 'lost' ? 'Lost' : 'Found';
export default function Listings() {
  const params = useLocalSearchParams<{ type?: string }>();
  const p = usePalette();
  const [type, setType] = useState<ListingType>(types.includes(params.type as ListingType) ? params.type as ListingType : 'marketplace');
  const [query, setQuery] = useState('');
  useEffect(() => { if (types.includes(params.type as ListingType)) setType(params.type as ListingType); }, [params.type]);
  const listingsQuery = useApiQuery<ApiListingPage>(apiQueryKey('listings', type), '/listings', { type, limit: 100 });
  const shown = (listingsQuery.data?.items ?? []).filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  return <Screen><TopBar title="Listings" subtitle="Campus exchange without payments or escrow" left={<IconButton icon="chevron-back" label="Back" onPress={() => goBackOrReplace('/(tabs)/discover')} />} right={<Button compact label="Manage requests" variant="ghost" onPress={() => router.push('/discover/listings/requests')} />} /><SearchField value={query} onChangeText={setQuery} placeholder={`Search ${labelFor(type).toLowerCase()} listings`} /><View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>{types.map((item) => <Chip key={item} label={labelFor(item)} selected={type === item} onPress={() => setType(item)} />)}</View><SectionHeader title={labelFor(type)} action="Create listing" onAction={() => router.push({ pathname: '/discover/listings/new', params: { type } })} />{listingsQuery.isError ? <StateView icon="cloud-offline" tone="danger" title="Listings unavailable" detail={listingsQuery.error.message} action="Retry" onAction={() => listingsQuery.refetch()} /> : listingsQuery.isLoading ? <StateView icon="hourglass-outline" title="Loading listings" detail="Fetching live campus listings…" /> : shown.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{shown.map((listing, index) => <Card key={listing.id} onPress={() => router.push(`/discover/listings/${listing.id}`)} style={{ width: '48.2%', padding: 0, overflow: 'hidden', marginBottom: 12 }}><View style={{ height: 112, backgroundColor: ['#DDEBFF', '#FFF0ED', '#EAFBF4'][index % 3], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={type === 'marketplace' ? 'pricetag' : type === 'lost' ? 'search' : 'hand-left'} size={38} color="#344054" /></View><View style={{ padding: 12 }}><Badge label={labelFor(listing.type)} tone={listing.type === 'marketplace' ? 'brand' : 'warning'} /><Text numberOfLines={2} style={{ color: p.ink, fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 8 }}>{listing.title}</Text>{listing.priceMinor != null ? <Text style={{ color: p.brand, fontSize: 15, fontWeight: '900', marginTop: 5 }}>{listing.currency ?? 'INR'} {(listing.priceMinor / 100).toFixed(2)}</Text> : <Text style={{ color: p.muted, fontSize: 12, marginTop: 5 }}>{listing.locationText ?? 'Campus location'}</Text>}</View></Card>)}</View> : <StateView icon="pricetag-outline" title="No listings here yet" detail="Create a clear, safe listing to help your campus community." action="Create listing" onAction={() => router.push({ pathname: '/discover/listings/new', params: { type } })} />}</Screen>;
}
