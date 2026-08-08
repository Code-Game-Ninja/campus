import type { CampusEvent } from '@/types';

export interface ApiEvent {
  id: string; campusId: string; organizerId: string; organizerName?: string; title: string; description: string;
  location: string; bannerUrl: string | null; category: string; timezone: string;
  onlineUrl: string | null; registrationDeadline: string | null; contact: string | null;
  accessibilityNotes: string | null; terms: string | null; photoUrls: string[];
  startTime: string; endTime: string; capacity: number | null; registeredCount: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed'; createdAt: string; updatedAt: string;
  userRegistrationStatus?: 'registered' | 'waitlisted' | 'cancelled' | null;
  reminderEnabled?: boolean;
}


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
    organizer: event.organizerName ?? `Organizer ${initials || 'CS'}`,
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
