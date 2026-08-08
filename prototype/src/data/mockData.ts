import type { User, Post, CampusEvent, Resource, Listing, Club, Person, ActivityItem, Connection } from '../types';

export const MOCK_ME = { userId: 'u_123', campusId: 'c_1', created: false };

export const MOCK_USER: User = {
  name: 'Alex Developer',
  email: 'alex@example.edu',
  initials: 'AD',
  campus: 'State University',
  department: 'Computer Science',
  year: 'Junior',
  discoverable: true,
  verified: true,
  bio: 'Building things for the web and mobile.',
  interests: ['Coding', 'Design', 'AI'],
  universityId: 'u_1',
  universityCountry: 'US',
};

export const MOCK_POSTS: Post[] = [
  {
    id: 'p_1',
    author: 'Alex Developer',
    initials: 'AD',
    time: '2 hours ago',
    campus: 'State University',
    scope: 'campus',
    kind: 'discussion',
    body: 'Anyone interested in forming a study group for CS301? The midterms are coming up fast.',
    accent: '#4ade80',
    reactions: 12,
    comments: 3,
    reacted: false,
    saved: false,
    why: 'Campus discussion'
  },
  {
    id: 'p_2',
    author: 'Admin',
    initials: 'SU',
    time: '5 hours ago',
    campus: 'State University',
    scope: 'campus',
    kind: 'announcement',
    title: 'Library Hours Extended',
    body: 'The main library will now be open 24/7 during finals week. Make sure to bring your student ID!',
    accent: '#3b82f6',
    reactions: 45,
    comments: 8,
    official: true,
    why: 'Official announcement'
  }
];

export const MOCK_EVENTS: CampusEvent[] = [
  {
    id: 'e_1',
    title: 'Tech Career Fair',
    category: 'Career',
    date: 'Oct 15, 2026',
    time: '10:00 AM',
    timezone: 'EST',
    venue: 'Student Union',
    organizer: 'Career Services',
    description: 'Meet recruiters from top tech companies. Dress code is business casual.',
    capacity: 500,
    attendees: 342,
    deadline: 'Oct 10, 2026',
    accent: '#8b5cf6',
    gallery: []
  },
  {
    id: 'e_2',
    title: 'Hackathon 2026',
    category: 'Technology',
    date: 'Nov 1, 2026',
    time: '6:00 PM',
    timezone: 'EST',
    venue: 'Innovation Center',
    organizer: 'Computer Science Club',
    description: '48-hour coding marathon. Food and drinks provided!',
    capacity: 200,
    attendees: 150,
    deadline: 'Oct 25, 2026',
    accent: '#10b981',
    registered: true,
    gallery: []
  }
];

export const MOCK_RESOURCES: Resource[] = [
  {
    id: 'rs_1',
    title: 'Intro to Algorithms Study Guide',
    subject: 'CS301',
    department: 'Computer Science',
    semester: 'Fall 2026',
    uploader: 'Jane Doe',
    description: 'Comprehensive study guide covering sorting and graph algorithms.',
    rating: 4.8,
    saves: 120,
    status: 'approved',
    accent: '#f59e0b',
    sourceType: 'pdf'
  }
];

export const MOCK_LISTINGS: Listing[] = [
  {
    id: 'l_1',
    type: 'marketplace',
    title: 'Used Calculus Textbook',
    description: 'Good condition, some highlighting.',
    price: 45,
    currency: '$',
    location: 'North Campus Dorms',
    owner: 'John Smith',
    condition: 'Used',
    accent: '#ec4899',
    contactState: 'none'
  }
];

export const MOCK_CLUBS: Club[] = [
  {
    id: 'c_1',
    name: 'Debate Society',
    category: 'Academic',
    description: 'Join us for weekly debates on current events and philosophy.',
    members: 85,
    accent: '#06b6d4',
    joined: false
  }
];

export const MOCK_PEOPLE: Person[] = [
  {
    id: 'u_456',
    name: 'Jane Doe',
    initials: 'JD',
    department: 'Mathematics',
    year: 'Senior',
    campus: 'State University',
    skills: ['Math', 'Physics'],
    reasons: ['Networking'],
    connected: false
  }
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'a_1',
    title: 'New comment on your post',
    detail: 'Jane Doe replied to your discussion.',
    category: 'social',
    time: '1 hour ago',
    read: false
  }
];

export const MOCK_CONNECTIONS: Connection[] = [
  {
    id: 'conn_1',
    name: 'Jane Doe',
    initials: 'JD',
    preview: 'Sure, I can help with that.',
    unread: 1,
    accepted: true,
    messages: [
      { id: 'm_1', text: 'Hey, do you have the notes from yesterday?', mine: true, time: '10:00 AM' },
      { id: 'm_2', text: 'Sure, I can help with that.', mine: false, time: '10:05 AM' }
    ]
  }
];

export const MOCK_NOTIFICATIONS: any[] = [];
export const MOCK_PREFERENCES: any[] = [];
