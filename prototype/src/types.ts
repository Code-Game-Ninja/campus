export type Scope = 'campus' | 'global';
export type FeedTab = 'For you' | 'Following' | 'Official';

export type User = {
  name: string; email: string; initials: string; campus: string; department: string;
  year: string; discoverable: boolean; verified: boolean; bio: string; interests: string[];
  /**
   * Institution chosen during onboarding, from the public /universities
   * catalogue. This is a REFERENCE, not a tenant assignment — the server
   * resolves the real campus_id at signup (see contracts/universities.ts).
   * `campus` above stays the display name so existing screens are unaffected.
   */
  universityId?: string;
  universityCountry?: string;
  /** Email domain of the institution. An affiliation HINT only, never proof. */
  universityDomain?: string;
  contentWarnings?: number;
  lastContentWarning?: string;
  avatarOptionId?: string;
  avatarSeed?: string;
};

export type Post = {
  id: string; author: string; initials: string; role?: string; time: string; campus: string;
  scope: Scope; kind: 'discussion' | 'announcement' | 'achievement' | 'meme';
  title?: string; body: string; accent: string; reactions: number; comments: number;
  reacted?: boolean; saved?: boolean; official?: boolean; why: string;
  authorId?: string; authorType?: 'person' | 'club';
  media?: string[]; eventId?: string; recruitment?: boolean;
  version?: number;
};

export type CampusEvent = {
  id: string; title: string; category: string; date: string; time: string; timezone: string;
  venue: string; organizer: string; description: string; capacity: number; attendees: number;
  deadline: string; accent: string; registered?: boolean; gallery: string[]; organizerId?: string; teamId?: string;
};

export type Resource = {
  id: string; title: string; subject: string; department: string; semester: string; uploader: string;
  description: string; rating: number; saves: number; status: 'approved' | 'pending' | 'blocked'; saved?: boolean; accent: string;
  ownerId?: string; sourceType?: 'pdf' | 'youtube' | 'drive'; sourceUrl?: string;
  moderationReason?: string; moderatedAt?: string;
};

export type Listing = {
  id: string; type: 'marketplace' | 'lost' | 'found'; title: string; description: string;
  price?: number; currency?: string; location: string; owner: string; condition?: string;
  accent: string; contactState?: 'none' | 'pending' | 'accepted'; saved?: boolean; ownerId?: string;
};

export type Club = {
  id: string; name: string; category: string; description: string; members: number;
  accent: string; joined?: boolean; pending?: boolean; following?: boolean;
};

export type Person = {
  id: string; name: string; initials: string; department: string; year: string; campus: string;
  skills: string[]; reasons: string[]; connected?: boolean; requestPending?: boolean; following?: boolean;
  eventTitles?: { eventId: string; eventName: string; title: string }[];
};

export type Team = { id: string; name: string; goal: string; members: number; skills: string[]; accent: string; ownerId?: string };
export type Message = { id: string; text: string; mine: boolean; time: string; failed?: boolean };
export type Connection = { id: string; name: string; initials: string; preview: string; unread: number; accepted: boolean; incoming?: boolean; messages: Message[] };
export type ActivityItem = { id: string; title: string; detail: string; category: 'social' | 'event' | 'club' | 'security'; time: string; read?: boolean };
export type Opportunity = { id: string; title: string; organization: string; deadline: string; category: string; verified: boolean; description: string };

export type Toast = { type: 'success' | 'error' | 'info'; message: string } | null;
