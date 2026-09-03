import type { Icon } from '@phosphor-icons/react';
import {
  BellRinging,
  Briefcase,
  ChatsCircle,
  Compass,
  FileText,
  Newspaper,
  ShieldCheck,
  Tag,
  UsersFour,
  UsersThree,
  CalendarBlank,
} from '@phosphor-icons/react';

/**
 * Copy is taken from the shipping app screens under prototype/app and from the
 * real device captures in img_screens/, so the site never promises something
 * the APK does not do.
 */

export interface BentoFeature {
  id: string;
  headline: string;
  body: string;
  icon: Icon;
  /** Tailwind column span at lg and up. Drives the asymmetric grid rhythm. */
  span: string;
  /** Screenshot under public/screens/. */
  shot: string;
  shotAlt: string;
  /** 'side' puts the device beside the copy, 'below' stacks it under. */
  shotLayout: 'side' | 'below';
}

export const bentoFeatures: BentoFeature[] = [
  {
    id: 'feed',
    headline: 'Your campus first, the network second',
    body: 'Switch between campus and global, then choose For you, Following or Official. Campus Pulse sits on top with what is actually moving today.',
    icon: Newspaper,
    span: 'lg:col-span-7',
    shot: 'home.webp',
    shotAlt: 'CampusSphere home feed showing the campus and global switch above For you, Following and Official tabs',
    shotLayout: 'side',
  },
  {
    id: 'events',
    headline: 'Events, filtered down to what you care about',
    body: 'Search upcoming events or narrow them to Technology, Culture or Music. Dates render in your own timezone.',
    icon: CalendarBlank,
    span: 'lg:col-span-5',
    shot: 'events.webp',
    shotAlt: 'CampusSphere events screen with All, Technology, Culture and Music filters',
    shotLayout: 'below',
  },
  {
    id: 'teams',
    headline: 'Find people by what they actually do',
    body: 'Filter by React Native, UI/UX, Research, Design, Startups and more, or flip to Teams and post one. One toggle removes you from recommendations.',
    icon: UsersThree,
    span: 'lg:col-span-5',
    shot: 'teams.webp',
    shotAlt: 'CampusSphere Team Finder with skill filter chips and a recommended person',
    shotLayout: 'below',
  },
  {
    id: 'notes',
    headline: 'The notes nobody shares in the group chat',
    body: 'Share a PDF once and it shows up as a campus resource for everyone else, with a status badge so you know it is still available.',
    icon: FileText,
    span: 'lg:col-span-7',
    shot: 'notes.webp',
    shotAlt: 'CampusSphere Notes hub listing campus PDF study materials',
    shotLayout: 'side',
  },
  {
    id: 'chat',
    headline: 'Private but reportable',
    body: 'Direct, group and campus threads with file attachments. The header says exactly what the thread is, and reporting the recent visible messages is a single tap under the composer.',
    icon: ChatsCircle,
    span: 'lg:col-span-12',
    shot: 'chat.webp',
    shotAlt: 'CampusSphere campus chat thread with a report recent visible messages action',
    shotLayout: 'side',
  },
];

export interface TabFeature {
  id: string;
  name: string;
  headline: string;
  body: string;
  icon: Icon;
  points: string[];
}

export const tabFeatures: TabFeature[] = [
  {
    id: 'listings',
    name: 'Listings',
    headline: 'Campus exchange without payments or escrow',
    body: 'Post what you want to pass on, browse what your campus is offering, and settle it in person. No wallet, no gateway, no card details anywhere.',
    icon: Tag,
    points: [
      'Sell, lend or give away with a photo and a plain description',
      'Track incoming requests on your own listings',
      'Everything scoped to your campus, not the open internet',
    ],
  },
  {
    id: 'clubs',
    name: 'Clubs',
    headline: 'Communities led by campus members',
    body: 'Find the club that already does the thing you are looking for, see who runs it, and follow along without waiting for a WhatsApp invite.',
    icon: UsersFour,
    points: ['Search clubs by name', 'See member-led activity', 'Browse before you commit'],
  },
  {
    id: 'opportunities',
    name: 'Opportunities',
    headline: 'Curated and source-verified',
    body: 'Internships and openings appear only after moderation review, so the board stays free of reposted scams and dead links.',
    icon: Briefcase,
    points: [
      'Nothing publishes without a moderation pass',
      'Open-now filter for deadlines that still matter',
      'Source is recorded on every listing',
    ],
  },
  {
    id: 'people',
    name: 'Discovery',
    headline: 'Meet people you would otherwise never sit next to',
    body: 'Recommendations are built from the skills and interests you save on your profile, and you can switch yourself out of them at any time.',
    icon: Compass,
    points: [
      'Search anyone by name or username',
      'Follow the people whose work you want to see',
      'One toggle removes you from recommendations',
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    headline: 'Notifications you control per type',
    body: 'Push and in-app alerts are grouped by what triggered them, and each group has its own switch. Turn off the noisy ones without losing the ones that matter.',
    icon: BellRinging,
    points: [
      'Per-event-type preferences, not one master switch',
      'Event reminders before the event, not after',
      'Dismiss and clear from the activity tab',
    ],
  },
  {
    id: 'safety',
    name: 'Safety',
    headline: 'Report, block and mute stay one tap away',
    body: 'Safety controls sit on every content surface instead of being buried in settings, and the important account actions are enforced on the server rather than hidden in the app.',
    icon: ShieldCheck,
    points: [
      'Report, block and mute on posts, profiles, messages and teams',
      'Request a data export, a campus change or account deletion',
      'Sign out one device or every device from Security and devices',
    ],
  },
];
