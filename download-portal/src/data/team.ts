/**
 * Mirrors prototype/src/data/developers.ts so the site credits the same people
 * the app credits. Keep the two in sync when the team changes.
 */

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  bio: string;
  focus: string[];
  /** lg column span. Deliberately uneven so the row is not three equal cards. */
  span: string;
}

export const team: TeamMember[] = [
  {
    name: 'Chirag Mishra',
    role: 'UI/UX, frontend and utility intelligence',
    initials: 'CM',
    bio: 'Leads product UI/UX and frontend delivery, and owns the utility and intelligence surfaces across CampusSphere.',
    focus: ['Mobile UI/UX and accessibility', 'Resources, listings, profiles, Team Finder', 'Search and opportunities'],
    span: 'lg:col-span-6',
  },
  {
    name: 'Radha',
    role: 'Security and testing',
    initials: 'R',
    bio: 'Owns the security foundation and the verification standards every other product area is measured against.',
    focus: ['Auth, tenant scope, PostgreSQL RLS', 'Audit logging, rate limits, signed URLs', 'CI/CD and adversarial test coverage'],
    span: 'lg:col-span-3',
  },
  {
    name: 'Tanay',
    role: 'Community full-stack',
    initials: 'T',
    bio: 'Owns community experiences end to end across the API, the mobile app and the moderation surfaces behind them.',
    focus: ['Feed, clubs, polls, events', 'Notifications and realtime chat', 'Community APIs and module tests'],
    span: 'lg:col-span-3',
  },
];

export const projectGithubUrl = 'https://github.com/Code-Game-Ninja/Campus-Sphere';
