import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export interface DeveloperLink {
  label: string;
  url: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

export interface DeveloperProfile {
  name: string;
  role: string;
  track: string;
  bio: string;
  initials: string;
  focusAreas: readonly string[];
  links?: DeveloperLink[];
}

export const developerPageLinks: readonly DeveloperLink[] = [
  {
    label: 'Project GitHub',
    url: 'https://github.com/Code-Game-Ninja/Campus-Sphere',
    icon: 'logo-github',
  },
];

/** Team ownership data. Focus areas describe responsibility, not release availability. */
export const developers: readonly DeveloperProfile[] = [
  {
    name: 'Radha',
    role: 'Security & Testing Engineer',
    track: 'Dev A · Foundation owner',
    bio: 'Owns CampusSphere security foundation and verification standards used across every product area.',
    initials: 'R',
    focusAreas: [
      'Authentication, tenant scope, policy checks, and PostgreSQL RLS',
      'Audit logging, rate limits, signed URLs, and shared security controls',
      'CI/CD, test infrastructure, and adversarial security coverage',
    ],
  },
  {
    name: 'Tanay',
    role: 'Community Full-Stack Developer',
    track: 'Dev B · Community track',
    bio: 'Owns community experiences end to end across API, mobile, and supporting moderation surfaces.',
    initials: 'T',
    focusAreas: [
      'Feed, clubs, communities, polls, and events',
      'Notifications, connection requests, and realtime chat',
      'Community APIs, mobile flows, admin surfaces, and module tests',
    ],
  },
  {
    name: 'Chirag Mishra',
    role: 'UI/UX, Frontend & Utility Intelligence Developer',
    track: 'Dev C · Utility + Intelligence track',
    bio: 'Leads product UI/UX and frontend delivery while owning utility and intelligence experiences across CampusSphere.',
    initials: 'CM',
    focusAreas: [
      'Mobile UI/UX, frontend systems, accessibility, and product consistency',
      'Resources, marketplace, profiles, discovery, and Team Finder',
      'Search, opportunities, and permission-aware AI experiences',
    ],
  },
];
