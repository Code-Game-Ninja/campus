const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const me = {
  userId: 'u_123',
  campusId: 'c_1',
  campusName: 'State University',
  created: false,
  roles: [{ roleName: 'campus_admin' }],
};

let profile = {
  userId: me.userId,
  displayName: 'Alex Developer',
  avatarUrl: null,
  department: 'Computer Science',
  studyYear: 3,
  bio: 'Building useful things for campus life.',
  skills: ['React', 'TypeScript', 'UI/UX'],
  interests: ['Coding', 'Design', 'AI'],
  links: [{ label: 'Portfolio', url: 'https://example.com' }],
  discoverable: true,
  isSelf: true,
  isCrossCampus: false,
};

const people = [
  profile,
  { ...profile, userId: 'u_456', displayName: 'Jane Doe', department: 'Mathematics', studyYear: 4, bio: 'Math mentor and hackathon teammate.', skills: ['Math', 'Python', 'Research'], interests: ['AI', 'Teaching'], links: [], isSelf: false },
  { ...profile, userId: 'u_789', displayName: 'Sam Rivera', department: 'Design', studyYear: 2, bio: 'Product designer looking for builders.', skills: ['Figma', 'UI/UX'], interests: ['Design', 'Startups'], links: [], isSelf: false, isCrossCampus: true },
];

let posts = [
  {
    id: 'p_1', scope: 'campus', authorMode: 'named',
    author: { userId: me.userId, displayName: profile.displayName, avatarUrl: null },
    title: null, body: 'Anyone interested in forming a study group for CS301? The midterms are coming up fast.',
    kind: 'discussion', visibility: 'campus', reactions: { like: 12, celebrate: 1, insightful: 3, support: 0 },
    commentCount: 2, publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(), editedAt: null,
    whyThis: ['Campus discussion', 'Matches Computer Science'], version: 1, viewerReaction: null, viewerBookmarked: true, mediaUrls: [], eventId: null, recruitment: false,
  },
  {
    id: 'p_2', scope: 'campus', authorMode: 'official',
    author: { userId: 'u_admin', displayName: 'State University', avatarUrl: null },
    title: 'Library Hours Extended', body: 'The main library will remain open 24/7 during finals week.',
    kind: 'announcement', visibility: 'campus', reactions: { like: 41, celebrate: 8, insightful: 2, support: 0 },
    commentCount: 1, publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(), editedAt: null,
    whyThis: ['Official campus announcement'], version: 1, viewerReaction: 'like', viewerBookmarked: false, mediaUrls: [], eventId: null, recruitment: false,
  },
];

const comments: Record<string, any[]> = {
  p_1: [
    { id: 'comment_1', postId: 'p_1', parentId: null, author: { userId: 'u_456', displayName: 'Jane Doe', avatarUrl: null }, body: 'I am in. I can cover graph algorithms.', createdAt: new Date(Date.now() - 70 * 60_000).toISOString() },
    { id: 'comment_2', postId: 'p_1', parentId: null, author: { userId: 'u_789', displayName: 'Sam Rivera', avatarUrl: null }, body: 'Can we meet in the innovation lab?', createdAt: new Date(Date.now() - 45 * 60_000).toISOString() },
  ],
};

let events = [
  {
    id: 'e_1', campusId: me.campusId, organizerId: me.userId, title: 'Tech Career Fair', description: 'Meet recruiters, alumni and startup founders.',
    location: 'Student Union', bannerUrl: null, category: 'Career', timezone: 'Asia/Kolkata', onlineUrl: null,
    registrationDeadline: '2026-10-10T18:00:00.000Z', contact: 'careers@example.edu', accessibilityNotes: null, terms: null, photoUrls: [],
    startTime: '2026-10-15T04:30:00.000Z', endTime: '2026-10-15T10:30:00.000Z', capacity: 500, registeredCount: 342,
    status: 'published', createdAt: now(), updatedAt: now(), userRegistrationStatus: null,
  },
  {
    id: 'e_2', campusId: me.campusId, organizerId: me.userId, title: 'Hackathon 2026', description: 'A 48-hour coding marathon with mentors and demo day.',
    location: 'Innovation Center', bannerUrl: null, category: 'Technology', timezone: 'Asia/Kolkata', onlineUrl: null,
    registrationDeadline: '2026-10-25T18:00:00.000Z', contact: 'hack@example.edu', accessibilityNotes: null, terms: null, photoUrls: [],
    startTime: '2026-11-01T12:30:00.000Z', endTime: '2026-11-03T12:30:00.000Z', capacity: 200, registeredCount: 150,
    status: 'published', createdAt: now(), updatedAt: now(), userRegistrationStatus: 'registered',
  },
];

let eventTeams: any[] = [{
  id: 'et_1', eventId: 'e_2', organizerId: me.userId, organizerName: profile.displayName, name: 'Hackathon Core Team', purpose: 'Run a smooth, welcoming hackathon.', recruiting: true,
  applicationDeadline: '2026-10-20T18:00:00.000Z', accent: '#E9E6FF',
  roles: [{ id: 'er_1', title: 'Frontend Lead', openings: 2, filled: 1, skills: ['React', 'React Native'], description: 'Build the participant experience.' }],
  members: [{ id: 'em_1', userId: me.userId, displayName: profile.displayName, title: 'Organizer', state: 'active' }],
  applications: [{ id: 'ea_1', roleId: 'er_1', applicantId: 'u_456', applicantName: 'Jane Doe', note: 'I can help with the dashboard.', state: 'pending', createdAt: now() }],
  invitations: [],
}];

let resources: any[] = [{
  id: 'rs_1', type: 'notes', title: 'Intro to Algorithms Study Guide', description: 'Sorting, graphs and dynamic programming revision notes.', subjectId: 'CS301', uploaderId: me.userId,
  mimeType: 'application/pdf', bytes: 820_000, ratingAvg: 4.8, ratingCount: 35, createdAt: now(), status: 'approved', scanState: 'clean',
}];

let listings = [
  { id: 'l_1', type: 'marketplace', category: 'Books', title: 'Used Calculus Textbook', description: 'Good condition with light highlighting.', priceMinor: 4500, currency: 'INR', condition: 'Good', locationText: 'North Campus common area', status: 'available', version: 1, ownerId: me.userId, isOwner: true, createdAt: now(), contactChannel: 'Campus chat' },
  { id: 'l_2', type: 'lost', category: 'Electronics', title: 'Lost black earbuds case', description: 'Last seen near the main library.', priceMinor: null, currency: null, condition: null, locationText: 'Main library', status: 'open', version: 1, ownerId: 'u_456', isOwner: false, createdAt: now() },
  { id: 'l_3', type: 'found', category: 'ID cards', title: 'Found student ID card', description: 'Submitted to the student union desk.', priceMinor: null, currency: null, condition: null, locationText: 'Student Union', status: 'open', version: 1, ownerId: 'u_789', isOwner: false, createdAt: now() },
];
const contactRequests: Record<string, any[]> = { l_1: [{ id: 'cr_1', listingId: 'l_1', requesterId: 'u_456', state: 'pending', message: 'Is it still available?', createdAt: now() }] };

const clubs = [{ id: 'club_1', campusId: me.campusId, type: 'club', name: 'Computer Science Club', slug: 'computer-science-club', visibility: 'campus', status: 'active', verificationStatus: 'verified', verificationProof: null, createdAt: now() }];
const clubMembers = [{ id: 'cm_1', communityId: 'club_1', userId: me.userId, role: 'admin', status: 'active', joinedAt: now() }, { id: 'cm_2', communityId: 'club_1', userId: 'u_456', role: 'member', status: 'active', joinedAt: now() }];

let teamRequests = [{ id: 'tr_1', scope: 'campus', goalType: 'hackathon', title: 'Build a campus navigation app', description: 'Looking for a designer and a mobile developer.', neededTags: ['React Native', 'Figma'], timeWindowStart: null, timeWindowEnd: null, capacity: 4, applicationPrompt: 'What would you like to build?', status: 'open', version: 1, ownerId: me.userId, isOwner: true, myApplicationId: null, myApplicationState: null, myApplicationKind: null, createdAt: now() }];
const teamApplications: Record<string, any[]> = { tr_1: [{ id: 'ta_1', teamRequestId: 'tr_1', applicantId: 'u_456', applicantDisplayName: 'Jane Doe', teamTitle: 'Build a campus navigation app', responseText: 'I can own data and testing.', kind: 'application', state: 'pending', createdAt: now(), respondedAt: null }] };

let connections: any[] = [{ id: 'conn_1', otherUserId: 'u_456', otherDisplayName: 'Jane Doe', isCrossCampus: false, origin: 'team_request', direction: 'incoming', state: 'accepted', createdAt: now(), acceptedAt: now(), endedAt: null }];
let rooms: any[] = [{ id: 'room_1', campusId: me.campusId, type: 'dm', name: null, communityId: null, createdAt: now(), members: [{ id: 'member_1', roomId: 'room_1', userId: me.userId, displayName: profile.displayName, role: 'member', joinedAt: now() }, { id: 'member_2', roomId: 'room_1', userId: 'u_456', displayName: 'Jane Doe', role: 'member', joinedAt: now() }] }];
const roomMessages: Record<string, any[]> = { room_1: [{ id: 'msg_1', campusId: me.campusId, roomId: 'room_1', senderId: 'u_456', content: 'Sure, I can help with the CS301 notes.', createdAt: now(), editedAt: null }] };

let bookmarks = [{ target_type: 'post', target_id: 'p_1' }, { target_type: 'resource', target_id: 'rs_1' }];
let follows = [{ targetType: 'person', targetId: 'u_456', displayName: 'Jane Doe', followedAt: now() }, { targetType: 'club', targetId: 'club_1', displayName: 'Computer Science Club', followedAt: now() }];
let blocks: any[] = [];
let accountRequests: any[] = [];
let notifications = [
  { id: 'n_1', campusId: me.campusId, recipientId: me.userId, eventType: 'comment', title: 'New comment', body: 'Jane replied to your CS301 post.', read: false, referenceType: 'post', referenceId: 'p_1', createdAt: now() },
  { id: 'n_2', campusId: me.campusId, recipientId: me.userId, eventType: 'event_reminder', title: 'Hackathon registration confirmed', body: 'You are registered for Hackathon 2026.', read: true, referenceType: 'event', referenceId: 'e_2', createdAt: now() },
];
let notificationPreferences = ['post_reaction', 'comment', 'event_reminder', 'club_update', 'chat_message', 'security_alert'].map((eventType, index) => ({ id: `np_${index}`, campusId: me.campusId, userId: me.userId, eventType, inApp: true, push: eventType !== 'post_reaction', emailDigest: eventType === 'security_alert', updatedAt: now() }));
const meetings: Record<string, any[]> = { et_1: [{ id: 'meet_1', title: 'Volunteer kickoff', agenda: 'Roles, schedule and participant support.', startsAt: '2026-08-10T10:30:00.000Z', endsAt: '2026-08-10T11:30:00.000Z', location: 'Innovation Center 204', onlineUrl: null, status: 'scheduled' }] };

const opportunities = [{ id: 'opp_1', scope: 'global', title: 'Open Source Campus Fellowship', provider: 'CampusSphere Labs', category: 'Technology', deadline: '2026-12-01T18:00:00.000Z', sourceUrl: 'https://example.com/fellowship', eligibility: 'Open to enrolled students interested in open-source software.', state: 'verified', version: 1, createdAt: now() }];
const universities = [{ id: 'uni_1', name: 'State University', country: 'India', countryCode: 'IN', domain: 'state.example.edu', stateProvince: 'Delhi' }, { id: 'uni_2', name: 'National Institute of Technology', country: 'India', countryCode: 'IN', domain: 'nit.example.edu', stateProvince: 'Karnataka' }];

function findProfile(userId: string) {
  const found = people.find((item) => item.userId === userId) ?? people[1];
  return { ...found, isSelf: userId === me.userId };
}

function search(query: Record<string, string | number | undefined | null>) {
  const q = String(query.q ?? '').toLowerCase();
  const type = query.type ? String(query.type) : null;
  const hits = [
    ...people.map((item) => ({ id: item.userId, docType: 'person', title: item.displayName, scope: item.isCrossCampus ? 'global' : 'campus', score: 1, excerpt: `${item.department} · ${(item.skills ?? []).join(', ')}` })),
    ...resources.map((item) => ({ id: item.id, docType: 'resource', title: item.title, scope: 'campus', score: 0.9, excerpt: item.description })),
    ...posts.map((item) => ({ id: item.id, docType: 'post', title: item.title ?? item.body.slice(0, 55), scope: item.scope, score: 0.8, excerpt: item.body })),
  ].filter((item) => (!type || item.docType === type) && (!q || `${item.title} ${item.excerpt}`.toLowerCase().includes(q)));
  return { hits, degraded: false, requestId: id('search') };
}

export function mockGet(path: string, query: Record<string, string | number | undefined | null>) {
  if (path === 'me') return me;
  if (path.startsWith('profiles/')) return findProfile(path.split('/').pop() === 'me' ? me.userId : path.split('/').pop()!);
  if (path === 'posts' || path === 'feed') return { items: posts, nextCursor: null };
  if (/^posts\/[^/]+$/.test(path)) return posts.find((item) => item.id === path.split('/')[1]) ?? null;
  if (/^posts\/[^/]+\/comments$/.test(path)) return { items: comments[path.split('/')[1]] ?? [], nextCursor: null };
  if (path === 'events') return events;
  if (path === 'events/event-teams/mine' || path === 'events/teams') return eventTeams;
  if (/^events\/[^/]+$/.test(path)) return events.find((item) => item.id === path.split('/')[1]) ?? null;
  if (/^events\/[^/]+\/teams$/.test(path)) return eventTeams.filter((team) => team.eventId === path.split('/')[1]);
  if (/^events\/[^/]+\/teams\/[^/]+\/meetings$/.test(path)) return meetings[path.split('/')[3]] ?? [];
  if (path === 'resources') return { items: resources, nextCursor: null };
  if (/^resources\/[^/]+\/download$/.test(path)) return { downloadUrl: 'https://example.com/mock-study-guide.pdf', expiresAt: new Date(Date.now() + 3600_000).toISOString() };
  if (path === 'listings' || path === 'marketplace') return { items: listings.filter((item) => !query.type || item.type === query.type), nextCursor: null };
  if (/^listings\/[^/]+$/.test(path)) return listings.find((item) => item.id === path.split('/')[1]) ?? null;
  if (/^listings\/[^/]+\/contact-requests$/.test(path)) return contactRequests[path.split('/')[1]] ?? [];
  if (path === 'communities/clubs' || path === 'clubs') return clubs;
  if (/^communities\/clubs\/[^/]+$/.test(path)) return clubs.find((item) => item.id === path.split('/')[2]) ?? null;
  if (/^communities\/clubs\/[^/]+\/members$/.test(path)) return clubMembers.filter((item) => item.communityId === path.split('/')[2]);
  if (path === 'recommendations') return people.filter((item) => item.userId !== me.userId).map((item) => ({ userId: item.userId, displayName: item.displayName, department: item.department, matchedTags: item.skills?.slice(0, 2) ?? [], explanations: ['skill_overlap', 'availability'] }));
  if (path === 'team-requests') return { items: teamRequests.filter((item) => query.status ? item.status === query.status : true), nextCursor: null };
  if (path === 'team-requests/invitations/mine') return Object.values(teamApplications).flat().filter((item) => item.kind === 'invitation' && item.applicantId === me.userId);
  if (/^team-requests\/[^/]+$/.test(path)) return teamRequests.find((item) => item.id === path.split('/')[1]) ?? null;
  if (/^team-requests\/[^/]+\/applications$/.test(path)) return teamApplications[path.split('/')[1]] ?? [];
  if (path === 'connections' || path === 'chat') return connections;
  if (path === 'chat/rooms') return rooms;
  if (/^chat\/rooms\/[^/]+$/.test(path)) return rooms.find((item) => item.id === path.split('/')[2]) ?? null;
  if (/^chat\/rooms\/[^/]+\/messages$/.test(path)) return { items: roomMessages[path.split('/')[2]] ?? [], nextCursor: null };
  if (path === 'notifications') return notifications.filter((item) => query.unreadOnly !== 'true' || !item.read);
  if (path === 'notifications/preferences') return notificationPreferences;
  if (path === 'bookmarks') return bookmarks;
  if (path === 'follows') return follows.filter((item) => !query.type || (query.type === 'people' ? item.targetType === 'person' : item.targetType === 'club'));
  if (path === 'blocks') return blocks;
  if (path === 'account/requests') return accountRequests;
  if (path === 'opportunities') return opportunities;
  if (path === 'universities') { const items = universities.filter((item) => !query.q || item.name.toLowerCase().includes(String(query.q).toLowerCase())); return { items, total: items.length, limit: Number(query.limit ?? 25), offset: 0 }; }
  if (path === 'search') return search(query);
  if (path === 'app-updates/android') return { platform: 'android', enabled: false, latestVersion: null, latestBuildNumber: null, minimumBuildNumber: null, downloadUrl: null, message: '', publishedAt: null };
  return [];
}

export function mockRequest(path: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body: any = {}) {
  if (path === 'profiles/me' && method === 'PATCH') { profile = { ...profile, ...body }; people[0] = profile; return profile; }
  if (path === 'assistant/messages' && method === 'POST') return { responseId: id('assistant'), answer: `Here is a prototype answer for “${body.message}”. Try the saved CS301 guide or the upcoming hackathon.`, cannotVerify: false, sources: [{ type: 'resource', id: 'rs_1', title: resources[0].title, excerpt: resources[0].description, updatedAt: now(), openPath: '/discover/notes/rs_1' }, { type: 'event', id: 'e_2', title: events[1].title, excerpt: events[1].description, updatedAt: events[1].updatedAt, openPath: '/discover/events/e_2' }] };
  if (path === 'bookmarks' && method === 'POST') { const key = body.targetType; const index = bookmarks.findIndex((item) => item.target_type === key && item.target_id === body.targetId); if (index >= 0) bookmarks.splice(index, 1); else bookmarks.push({ target_type: key, target_id: body.targetId }); return { bookmarked: index < 0 }; }
  if (/^posts\/[^/]+\/reactions$/.test(path) && method === 'POST') { const post = posts.find((item) => item.id === path.split('/')[1]); if (!post) return { added: false }; const added = post.viewerReaction !== body.kind; post.reactions.like += added ? 1 : -1; post.viewerReaction = added ? body.kind : null; return { added }; }
  if (path === 'posts' && method === 'POST') { const post = { ...posts[0], id: id('post'), title: body.title ?? null, body: body.body ?? '', scope: body.scope ?? 'campus', kind: body.kind ?? 'discussion', visibility: body.visibility ?? 'campus', reactions: { like: 0, celebrate: 0, insightful: 0, support: 0 }, commentCount: 0, publishedAt: now(), whyThis: ['Created in prototype'], version: 1, viewerBookmarked: false, viewerReaction: null, eventId: body.eventId ?? null, recruitment: Boolean(body.recruitment) }; posts = [post, ...posts]; return post; }
  if (/^posts\/[^/]+\/comments$/.test(path) && method === 'POST') { const postId = path.split('/')[1]; const comment = { id: id('comment'), postId, parentId: null, author: { userId: me.userId, displayName: profile.displayName, avatarUrl: null }, body: body.body, createdAt: now() }; comments[postId] = [comment, ...(comments[postId] ?? [])]; const post = posts.find((item) => item.id === postId); if (post) post.commentCount += 1; return comment; }
  if (/^posts\/[^/]+$/.test(path) && method === 'PATCH') { const post = posts.find((item) => item.id === path.split('/')[1]); if (post) Object.assign(post, body, { editedAt: now(), version: post.version + 1 }); return post; }
  if (/^posts\/[^/]+$/.test(path) && method === 'DELETE') { posts = posts.filter((item) => item.id !== path.split('/')[1]); return undefined; }
  if (path === 'events' && method === 'POST') { const event = { ...events[0], ...body, id: id('event'), campusId: me.campusId, organizerId: me.userId, registeredCount: 0, status: body.status ?? 'published', createdAt: now(), updatedAt: now(), photoUrls: body.photoUrls ?? [], userRegistrationStatus: null }; events = [event, ...events]; return event; }
  if (/^events\/[^/]+$/.test(path) && method === 'PATCH') { const event = events.find((item) => item.id === path.split('/')[1]); if (event) Object.assign(event, body, { updatedAt: now() }); return event; }
  if (/^events\/[^/]+$/.test(path) && method === 'DELETE') { events = events.filter((item) => item.id !== path.split('/')[1]); return undefined; }
  if (/^events\/[^/]+\/registrations$/.test(path)) { const event = events.find((item) => item.id === path.split('/')[1]); if (event) { const added = method === 'POST'; event.userRegistrationStatus = added ? 'registered' : null; event.registeredCount += added ? 1 : -1; } return { registered: method === 'POST' }; }
  if (/^events\/[^/]+\/teams$/.test(path) && method === 'POST') { const team = { ...eventTeams[0], ...body, id: id('event_team'), eventId: path.split('/')[1], organizerId: me.userId, organizerName: profile.displayName, roles: (body.roles ?? []).map((role: any) => ({ id: id('role'), filled: 0, ...role })), members: [], applications: [], invitations: [] }; eventTeams = [team, ...eventTeams]; return team; }
  if (/^events\/[^/]+\/teams\/[^/]+$/.test(path) && method === 'PATCH') { const team = eventTeams.find((item) => item.id === path.split('/')[3]); if (team) Object.assign(team, body); return team; }
  if (/^events\/[^/]+\/teams\/[^/]+\/meetings$/.test(path) && method === 'POST') { const teamId = path.split('/')[3]; const meeting = { id: id('meeting'), ...body, status: 'scheduled' }; meetings[teamId] = [meeting, ...(meetings[teamId] ?? [])]; return meeting; }
  if (/^events\/[^/]+\/teams\/[^/]+\/applications$/.test(path) && method === 'POST') { const team = eventTeams.find((item) => item.id === path.split('/')[3]); const application = { id: id('event_application'), roleId: body.roleId, applicantId: me.userId, applicantName: profile.displayName, note: body.note ?? '', state: 'pending', createdAt: now() }; if (team) team.applications = [application, ...team.applications]; return application; }
  if (/^events\/[^/]+\/teams\/[^/]+\/applications\/[^/]+$/.test(path) && method === 'PATCH') { const team = eventTeams.find((item) => item.id === path.split('/')[3]); const application = team?.applications.find((item: any) => item.id === path.split('/')[5]); if (application) { application.state = body.state; if (body.state === 'accepted') { const role = team?.roles.find((item: any) => item.id === application.roleId); if (role) role.filled += 1; team?.members.push({ id: id('event_member'), userId: application.applicantId, displayName: application.applicantName, title: role?.title ?? 'Team member', state: 'active' }); } } return application; }
  if (/^events\/[^/]+\/teams\/[^/]+\/invitations$/.test(path) && method === 'POST') { const team = eventTeams.find((item) => item.id === path.split('/')[3]); const invitation = { id: id('event_invitation'), roleId: body.roleId, inviteeId: body.inviteeId, inviteeName: findProfile(body.inviteeId).displayName, invitedBy: me.userId, state: 'pending', createdAt: now() }; if (team) team.invitations = [invitation, ...team.invitations]; return invitation; }
  if (/^events\/[^/]+\/teams\/[^/]+\/invitations\/[^/]+$/.test(path) && method === 'PATCH') { const team = eventTeams.find((item) => item.id === path.split('/')[3]); const invitation = team?.invitations.find((item: any) => item.id === path.split('/')[5]); if (invitation) invitation.state = body.state; return invitation; }
  if (path === 'listings' && method === 'POST') { const listing = { id: id('listing'), category: null, priceMinor: null, currency: null, condition: null, locationText: null, status: body.type === 'marketplace' ? 'available' : 'open', version: 1, ownerId: me.userId, isOwner: true, createdAt: now(), ...body }; listings = [listing, ...listings]; return listing; }
  if (/^listings\/[^/]+$/.test(path) && method === 'PATCH') { const listing = listings.find((item) => item.id === path.split('/')[1]); if (listing) Object.assign(listing, body, { version: listing.version + 1 }); return listing; }
  if (/^listings\/[^/]+\/contact-requests$/.test(path) && method === 'POST') { const listingId = path.split('/')[1]; const request = { id: id('contact'), listingId, requesterId: me.userId, state: 'pending', message: body.message ?? null, createdAt: now() }; contactRequests[listingId] = [request, ...(contactRequests[listingId] ?? [])]; return request; }
  if (/^listings\/[^/]+\/contact-requests\/[^/]+$/.test(path) && method === 'PATCH') { const [, listingId, , requestId] = path.split('/'); const request = (contactRequests[listingId] ?? []).find((item) => item.id === requestId); if (request) request.state = body.decision === 'accept' ? 'accepted' : 'declined'; return request; }
  if (path === 'team-requests' && method === 'POST') { const team = { id: id('team'), scope: 'campus', goalType: null, description: null, neededTags: [], timeWindowStart: null, timeWindowEnd: null, capacity: null, applicationPrompt: null, status: 'open', version: 1, ownerId: me.userId, isOwner: true, myApplicationId: null, myApplicationState: null, myApplicationKind: null, createdAt: now(), ...body }; teamRequests = [team, ...teamRequests]; return team; }
  if (/^team-requests\/[^/]+$/.test(path) && method === 'PATCH') { const team = teamRequests.find((item) => item.id === path.split('/')[1]); if (team) Object.assign(team, body, { version: team.version + 1 }); return team; }
  if (/^team-requests\/[^/]+\/(applications|invitations)$/.test(path) && method === 'POST') { const teamId = path.split('/')[1]; const invitation = path.endsWith('/invitations'); const application = { id: id(invitation ? 'invite' : 'application'), teamRequestId: teamId, applicantId: invitation ? body.targetUserId : me.userId, applicantDisplayName: invitation ? findProfile(body.targetUserId).displayName : profile.displayName, teamTitle: teamRequests.find((item) => item.id === teamId)?.title ?? 'Team', responseText: body.responseText ?? null, kind: invitation ? 'invitation' : 'application', state: 'pending', createdAt: now(), respondedAt: null }; teamApplications[teamId] = [application, ...(teamApplications[teamId] ?? [])]; return application; }
  if (/^team-requests\/[^/]+\/(applications|invitations)\/[^/]+$/.test(path) && method === 'PATCH') { const teamId = path.split('/')[1]; const application = (teamApplications[teamId] ?? []).find((item) => item.id === path.split('/')[3]); if (application) { application.state = body.decision === 'accept' ? 'accepted' : 'declined'; application.respondedAt = now(); } return application; }
  if (path === 'chat/rooms' && method === 'POST') { const otherId = body.memberIds?.[0] ?? 'u_456'; const existing = rooms.find((room) => room.type === 'dm' && room.members.some((member: any) => member.userId === otherId)); if (existing) return existing; const roomId = id('room'); const room = { id: roomId, campusId: me.campusId, type: body.type ?? 'dm', name: body.name ?? null, communityId: null, createdAt: now(), members: [me.userId, otherId].map((userId, index) => ({ id: id('member'), roomId, userId, displayName: findProfile(userId).displayName, role: index ? 'member' : 'admin', joinedAt: now() })) }; rooms = [room, ...rooms]; roomMessages[roomId] = []; return room; }
  if (/^chat\/team-requests\/[^/]+$/.test(path) && method === 'POST') { const team = teamRequests.find((item) => item.id === path.split('/')[2]); const roomId = `team_${team?.id ?? id('team')}`; const existing = rooms.find((room) => room.id === roomId); if (existing) return existing; const room = { id: roomId, campusId: me.campusId, type: 'group', name: team?.title ?? 'Team chat', communityId: null, createdAt: now(), members: [{ id: id('member'), roomId, userId: me.userId, displayName: profile.displayName, role: 'admin', joinedAt: now() }] }; rooms = [room, ...rooms]; roomMessages[roomId] = []; return room; }
  if (/^chat\/rooms\/[^/]+\/messages$/.test(path) && method === 'POST') { const roomId = path.split('/')[2]; const message = { id: id('message'), campusId: me.campusId, roomId, senderId: me.userId, content: body.content, createdAt: now(), editedAt: null }; roomMessages[roomId] = [message, ...(roomMessages[roomId] ?? [])]; return message; }
  if (/^connections\/[^/]+$/.test(path) && method === 'PATCH') { const connection = connections.find((item) => item.id === path.split('/')[1]); if (connection) connection.state = body.action === 'accept' ? 'accepted' : 'declined'; return connection; }
  if (path === 'connections' && method === 'POST') { const target = findProfile(body.targetUserId); const connection = { id: id('connection'), otherUserId: target.userId, otherDisplayName: target.displayName, isCrossCampus: target.isCrossCampus, origin: 'profile', direction: 'outgoing', state: 'pending', createdAt: now(), acceptedAt: null, endedAt: null }; connections = [connection, ...connections]; return connection; }
  if (/^follows\/(people|clubs)\/[^/]+$/.test(path)) { const [, kind, targetId] = path.split('/'); const targetType = kind === 'people' ? 'person' : 'club'; if (method === 'DELETE') { follows = follows.filter((item) => !(item.targetType === targetType && item.targetId === targetId)); return undefined; } const displayName = targetType === 'person' ? findProfile(targetId).displayName : clubs.find((item) => item.id === targetId)?.name ?? 'Campus club'; const follow = { targetType, targetId, displayName, followedAt: now() }; follows = [follow, ...follows.filter((item) => !(item.targetType === targetType && item.targetId === targetId))]; return follow; }
  if (/^communities\/clubs\/[^/]+\/members$/.test(path) && method === 'POST') { const clubId = path.split('/')[2]; const member = { id: id('club_member'), communityId: clubId, userId: me.userId, role: 'member', status: 'active', joinedAt: now() }; if (!clubMembers.some((item) => item.communityId === clubId && item.userId === me.userId)) clubMembers.push(member); return member; }
  if (path === 'account/requests' && method === 'POST') { const request = { id: id('request'), type: body.type, status: 'pending', targetUniversityId: body.targetUniversityId ?? null, reason: body.reason ?? null, requestedAt: now(), updatedAt: now(), completedAt: null }; accountRequests = [request, ...accountRequests]; return request; }
  if (/^account\/requests\/[^/]+$/.test(path) && method === 'DELETE') { accountRequests = accountRequests.filter((item) => item.id !== path.split('/')[2]); return undefined; }
  if (path === 'blocks' && method === 'POST') { const block = { blockedUserId: body.blockedUserId, createdAt: now() }; blocks = [block, ...blocks.filter((item) => item.blockedUserId !== body.blockedUserId)]; return block; }
  if (/^blocks\/[^/]+$/.test(path) && method === 'DELETE') { blocks = blocks.filter((item) => item.blockedUserId !== path.split('/')[1]); return undefined; }
  if (/^notifications\/[^/]+\/read$/.test(path) && method === 'PATCH') { const item = notifications.find((notification) => notification.id === path.split('/')[1]); if (item) item.read = true; return item; }
  if (path === 'notifications/preferences' && method === 'PATCH') { const item = notificationPreferences.find((preference) => preference.eventType === body.eventType); if (item) Object.assign(item, body, { updatedAt: now() }); return item; }
  if (path === 'resources/upload-intents' && method === 'POST') { const resourceId = id('resource'); resources = [{ id: resourceId, type: body.type, title: body.title, description: body.description ?? null, subjectId: null, uploaderId: me.userId, mimeType: body.mimeType, bytes: body.bytes, ratingAvg: null, ratingCount: 0, createdAt: now(), status: 'needs_review', scanState: 'pending' }, ...resources]; return { resourceId, uploadUrl: `mock://upload/${resourceId}`, expiresAt: new Date(Date.now() + 3600_000).toISOString() }; }
  if (/^resources\/[^/]+\/complete-upload$/.test(path) && method === 'POST') return { resourceId: path.split('/')[1], status: 'needs_review' };
  if (/^resources\/[^/]+$/.test(path) && method === 'PATCH') { const resource = resources.find((item) => item.id === path.split('/')[1]); if (resource) Object.assign(resource, body); return resource; }
  if (/^resources\/[^/]+$/.test(path) && method === 'DELETE') { resources = resources.filter((item) => item.id !== path.split('/')[1]); return undefined; }
  return { success: true };
}
