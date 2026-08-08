export type ListingType = 'lost' | 'found' | 'marketplace';
export type ListingStatus = 'open' | 'contact_requested' | 'matched' | 'returned' | 'closed' | 'available' | 'reserved' | 'sold' | 'removed';
export interface ApiListing { id: string; type: ListingType; category: string | null; title: string; description: string | null; priceMinor: number | null; currency: string | null; condition: string | null; locationText: string | null; status: ListingStatus; version: number; ownerId: string; isOwner: boolean; createdAt: string; contactChannel?: string }
export interface ApiListingPage { items: ApiListing[]; nextCursor: string | null }
export interface ContactRequest { id: string; listingId: string; requesterId: string; state: 'pending' | 'accepted' | 'declined'; message: string | null; createdAt: string }
