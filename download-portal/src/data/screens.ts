/**
 * Real device screenshots captured at 1080x2392, resized to 640w WebP.
 * Sources live in download-portal/img_screens/.
 *
 * Adding a screen: drop a 1080x2392 capture in img_screens/, resize it to 640w
 * WebP into public/screens/, and add an entry here. A missing file renders a
 * labelled empty slot rather than a mock.
 */

export interface ScreenShot {
  /** File under public/screens/ */
  file: string;
  label: string;
  caption: string;
}

export const screens: ScreenShot[] = [
  {
    file: 'home.webp',
    label: 'Home',
    caption: 'Campus or global, then For you, Following or Official.',
  },
  {
    file: 'discover.webp',
    label: 'Discover',
    caption: 'Browse campus life by category.',
  },
  {
    file: 'events.webp',
    label: 'Events',
    caption: 'Filter by Technology, Culture or Music.',
  },
  {
    file: 'notes.webp',
    label: 'Notes hub',
    caption: 'Campus study files, shared as PDFs.',
  },
  {
    file: 'teams.webp',
    label: 'Team Finder',
    caption: 'Find people by skill, or start a team.',
  },
  {
    file: 'chat.webp',
    label: 'Chat',
    caption: 'Private but reportable, one tap from the thread.',
  },
];
