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
  bio: string;
  initials: string;
  links?: DeveloperLink[];
}

/** Static showcase data. Replace these mock profiles when team details are final. */
export const developers: readonly DeveloperProfile[] = [
  {
    name: 'Aarav Mehta',
    role: 'Lead Developer',
    bio: 'Guides the product architecture and turns CampusSphere ideas into reliable experiences for students.',
    initials: 'AM',
    links: [
      {
        label: 'Project GitHub',
        url: 'https://github.com/Code-Game-Ninja/Campus-Sphere',
        icon: 'logo-github',
      },
    ],
  },
  {
    name: 'Maya Kapoor',
    role: 'UI/UX Designer',
    bio: 'Shapes accessible, welcoming interfaces that make campus communities feel simple to explore.',
    initials: 'MK',
  },
  {
    name: 'Rohan Verma',
    role: 'Backend Engineer',
    bio: 'Builds the secure APIs, data systems, and real-time features that keep CampusSphere connected.',
    initials: 'RV',
  },
];
