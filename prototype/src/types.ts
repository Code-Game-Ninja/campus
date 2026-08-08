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
  accountRole?: 'member' | 'organizer' | 'event-manager';
  roleStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  roleReason?: string;
  roleProof?: string;
  roleContact?: string;
  adminMessage?: string;
  adminResponse?: string;
  organizationMemberships?: string[];
  contentWarnings?: number;
  lastContentWarning?: string;
  avatarOptionId?: string;
  avatarSeed?: string;
  eventTitles?: { eventId: string; eventName: string; title: string }[];
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

export type TeamMeet = {
  id: string; title: string; description: string; date: string; time: string; venue: string;
  teamName: string; organizerId: string; attendees: number; accent: string;
};

export type EventTeamRole = {
  id: string; title: string; openings: number; filled: number; skills: string[]; description: string;
};

export type EventTeamMember = {
  id: string; personId?: string; name: string; initials: string; title: string; status: 'lead' | 'member';
};

export type EventTeamApplication = {
  id: string; personId: string; roleId: string; note: string; status: 'pending' | 'shortlisted' | 'accepted' | 'declined'; appliedAt: string;
};

export type EventTeam = {
  id: string; eventId?: string; name: string; purpose: string; organizerId: string; organizerName: string;
  recruiting: boolean; applicationDeadline: string; roles: EventTeamRole[]; members: EventTeamMember[];
  applications: EventTeamApplication[]; accent: string;
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
