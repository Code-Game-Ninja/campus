import type { LucideIcon } from 'lucide-react';
import {
  Activity, BellRing, Building2, CalendarDays, ClipboardCheck, FileText,
  Gauge, HeartPulse, LayoutDashboard, Megaphone, Settings, ShieldCheck,
  UserCog, UsersRound, UserRoundSearch,
} from 'lucide-react';

export type Role = 'campus_admin' | 'event_manager' | 'super_admin';
export type Tone = 'lime' | 'blue' | 'amber' | 'red' | 'neutral';
export type WorkspaceMeta = { label: string; short: string; scope: string; person: string; initials: string; email?: string };

export type NavItem = { label: string; icon: LucideIcon; count?: number };
export type Metric = { label: string; value: number; display: string; delta: string; context: string; tone: Tone };

export const roleMeta: Record<Role, WorkspaceMeta> = {
  campus_admin: { label: 'Campus Admin', short: 'Campus', scope: 'Northbridge University', person: 'Radha Verma', initials: 'RV' },
  event_manager: { label: 'Event Manager', short: 'Events', scope: 'Northbridge University', person: 'Tanay Sharma', initials: 'TS' },
  super_admin: { label: 'Super Admin', short: 'Global', scope: 'All campuses', person: 'Chirag Mishra', initials: 'CM' },
};

export const navByRole: Record<Role, NavItem[]> = {
  campus_admin: [
    { label: 'Overview', icon: LayoutDashboard }, { label: 'Events', icon: CalendarDays },
  { label: 'Posts', icon: FileText, count: 8 }, { label: 'Moderation', icon: ShieldCheck, count: 5 },
    { label: 'Users', icon: UserRoundSearch },
    { label: 'Event Managers', icon: UserCog }, { label: 'Notifications', icon: BellRing },
    { label: 'Campus Settings', icon: Settings },
  ],
  event_manager: [
    { label: 'Overview', icon: LayoutDashboard }, { label: 'Events', icon: CalendarDays, count: 3 },
    { label: 'Registrations', icon: ClipboardCheck }, { label: 'Venues & Media', icon: Building2 },
    { label: 'Notifications', icon: Megaphone },
  ],
  super_admin: [
    { label: 'Overview', icon: LayoutDashboard }, { label: 'Campuses', icon: Building2 }, { label: 'Users', icon: UserRoundSearch },
    { label: 'Staff & Roles', icon: UsersRound }, { label: 'All Content', icon: FileText, count: 18 },
    { label: 'Moderation', icon: ShieldCheck, count: 12 }, { label: 'Audit Log', icon: Activity },
    { label: 'Platform Health', icon: HeartPulse }, { label: 'Platform Settings', icon: Gauge },
  ],
};

export const metricsByRole: Record<Role, Metric[]> = {
  campus_admin: [
    { label: 'Campus members', value: 18420, display: '18,420', delta: '+8.4%', context: 'versus last month', tone: 'lime' },
    { label: 'Active events', value: 24, display: '24', delta: '+3', context: 'currently published', tone: 'blue' },
    { label: 'Posts to review', value: 8, display: '8', delta: '5 urgent', context: 'inside your campus', tone: 'amber' },
    { label: 'Event managers', value: 6, display: '6', delta: '1 pending', context: 'assigned to campus', tone: 'neutral' },
  ],
  event_manager: [
    { label: 'Upcoming events', value: 8, display: '8', delta: '+2 this week', context: 'owned by your team', tone: 'lime' },
    { label: 'Registrations', value: 1248, display: '1,248', delta: '+12.6%', context: 'across live events', tone: 'blue' },
    { label: 'Waitlisted', value: 67, display: '67', delta: '4 events', context: 'need capacity review', tone: 'amber' },
    { label: 'Drafts', value: 3, display: '3', delta: '2 ready', context: 'awaiting publication', tone: 'neutral' },
  ],
  super_admin: [
    { label: 'Active campuses', value: 42, display: '42', delta: '+3 this quarter', context: 'healthy assignments', tone: 'lime' },
    { label: 'Platform members', value: 246800, display: '246.8K', delta: '+9.1%', context: 'across all campuses', tone: 'blue' },
    { label: 'Open reports', value: 18, display: '18', delta: '6 high risk', context: 'platform moderation', tone: 'amber' },
    { label: 'Service health', value: 99.98, display: '99.98%', delta: 'Operational', context: 'synthetic status', tone: 'lime' },
  ],
};

export const events = [
  ['Design Systems Meetup', 'Aug 21, 2026', '342 / 400', 'Tanay Sharma', 'Published'],
  ['AI Research Colloquium', 'Aug 24, 2026', '180 / 180', 'Aarav Mehta', 'Waitlist'],
  ['Freshers Community Day', 'Aug 29, 2026', '628 / 900', 'Radha Verma', 'Published'],
  ['Open Mic Night', 'Sep 03, 2026', '94 / 160', 'Tanay Sharma', 'Draft'],
  ['Founder Stories', 'Sep 08, 2026', '215 / 300', 'Mira Shah', 'In review'],
  ['Sustainability Sprint', 'Sep 12, 2026', '128 / 220', 'Aarav Mehta', 'Published'],
  ['Robotics Open Lab', 'Sep 16, 2026', '76 / 120', 'Ananya Rao', 'Draft'],
];

export const posts = [
  ['Placement drive dates announced', 'Meera Joshi', '2', 'Review'],
  ['Lost: black sketchbook near library', 'Aarav Mehta', '0', 'Published'],
  ['Photography club recruitment', 'Ananya Rao', '4', 'Review'],
  ['Semester resources collection', 'Tanay Sharma', '0', 'Published'],
  ['Anonymous rumor thread', 'Private profile', '9', 'Escalated'],
  ['Volunteer call for community day', 'Radha Verma', '1', 'Published'],
  ['Exam support group schedule', 'Aarav Mehta', '3', 'Review'],
];

export const campuses = [
  ['Northbridge University', 'New Delhi', '18,420', 'Healthy'],
  ['Lakeside Institute', 'Pune', '12,890', 'Healthy'],
  ['East Valley College', 'Bengaluru', '9,412', 'Onboarding'],
  ['Riverview Technical University', 'Hyderabad', '22,140', 'Healthy'],
  ['Coastal Arts Institute', 'Mumbai', '7,680', 'Attention'],
  ['Meridian Institute', 'Jaipur', '8,960', 'Onboarding'],
  ['Summit School of Design', 'Ahmedabad', '6,740', 'Healthy'],
];

export const staff = [
  ['Radha Verma', 'Campus Admin', 'Northbridge University', 'Active'],
  ['Tanay Sharma', 'Event Manager', 'Northbridge University', 'Active'],
  ['Aarav Mehta', 'Event Manager', 'Northbridge University', 'Pending'],
  ['Mira Shah', 'Campus Admin', 'Lakeside Institute', 'Active'],
  ['Ananya Rao', 'Moderator', 'East Valley College', 'Active'],
  ['Kabir Singh', 'Event Manager', 'Riverview Technical University', 'Active'],
  ['Isha Nair', 'Campus Admin', 'Coastal Arts Institute', 'Pending'],
];

export const audit = [
  ['Event published', 'Tanay Sharma', 'Design Systems Meetup', '09:42', 'Recorded'],
  ['Report escalated', 'Radha Verma', 'Post #2481', '09:18', 'Recorded'],
  ['Manager invited', 'Chirag Mishra', 'Aarav Mehta', '08:56', 'Recorded'],
  ['Campus updated', 'Chirag Mishra', 'Lakeside Institute', 'Yesterday', 'Recorded'],
  ['Role assignment changed', 'Chirag Mishra', 'Kabir Singh', 'Yesterday', 'Recorded'],
  ['Content restored', 'Radha Verma', 'Post #2468', '2 days ago', 'Recorded'],
];

export const activity = [
  { time: '8m', title: 'High-risk post needs review', detail: 'Photography club recruitment received four reports.', actor: 'Moderation', tone: 'amber' as Tone },
  { time: '24m', title: 'Event reached capacity', detail: 'AI Research Colloquium moved new registrations to waitlist.', actor: 'Events', tone: 'blue' as Tone },
  { time: '1h', title: 'Manager invitation pending', detail: 'Aarav Mehta has not accepted the campus assignment.', actor: 'Staff', tone: 'neutral' as Tone },
  { time: '2h', title: 'Freshers Day published', detail: 'The attendee-facing event page is now available.', actor: 'Events', tone: 'lime' as Tone },
];
