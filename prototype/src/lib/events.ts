import type { CampusEvent } from '@/types';

export interface ApiEvent {
  id: string; campusId: string; organizerId: string; title: string; description: string;
  location: string; bannerUrl: string | null; category: string; timezone: string;
  onlineUrl: string | null; registrationDeadline: string | null; contact: string | null;
  accessibilityNotes: string | null; terms: string | null; photoUrls: string[];
  startTime: string; endTime: string; capacity: number | null; registeredCount: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed'; createdAt: string; updatedAt: string;
  userRegistrationStatus?: 'registered' | 'waitlisted' | 'cancelled' | null;
}

export interface ApiEventTeamRole { id: string; title: string; openings: number; filled: number; skills: string[]; description: string }
export interface ApiEventTeamMember { id: string; userId: string; displayName: string; title: string; state: 'active' | 'removed' }
export interface ApiEventTeamApplication { id: string; roleId: string; applicantId: string; applicantName: string; note: string; state: 'pending' | 'shortlisted' | 'accepted' | 'declined'; createdAt: string }
export interface ApiEventTeamInvitation { id: string; roleId: string; inviteeId: string; inviteeName: string; invitedBy: string; state: 'pending' | 'accepted' | 'declined'; createdAt: string }
export interface ApiEventTeam { id: string; eventId: string; organizerId: string; organizerName: string; name: string; purpose: string; recruiting: boolean; applicationDeadline: string | null; accent: string | null; roles: ApiEventTeamRole[]; members: ApiEventTeamMember[]; applications: ApiEventTeamApplication[]; invitations: ApiEventTeamInvitation[] }

export function mapEvent(event: ApiEvent): CampusEvent {
  const start = new Date(event.startTime);
  const initials = event.title.split(/\s+/).filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    date: Number.isNaN(start.getTime()) ? event.startTime : start.toLocaleDateString(),
    time: Number.isNaN(start.getTime()) ? '' : start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    timezone: event.timezone,
    venue: event.location,
    organizer: `Organizer ${initials || 'CS'}`,
    organizerId: event.organizerId,
    description: event.description,
    capacity: event.capacity ?? 0,
    attendees: event.registeredCount,
    deadline: event.registrationDeadline ?? 'No deadline',
    accent: '#DCE7FF',
    registered: event.userRegistrationStatus === 'registered',
    gallery: event.photoUrls,
  };
}
