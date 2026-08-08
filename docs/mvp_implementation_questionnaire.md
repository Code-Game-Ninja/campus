# CampusSphere MVP Implementation Questionnaire

**Status:** Waiting for product-owner answers  
**Created:** 8 August 2026  
**Purpose:** Collect every decision needed to create the implementation task plan  
**Next document after completion:** `docs/mvp_implementation_tasks.md`

## How to Fill This File

1. Write your answer after every `Answer:` line.
2. For checkbox questions, replace `[ ]` with `[x]` for your choice.
3. You may select more than one option only when the question says so.
4. If you are unsure about a technical question, write `USE RECOMMENDATION`.
5. If a feature should not be in the MVP, write `NOT IN MVP`.
6. Add any explanation under `Notes:`.
7. Questions marked **REQUIRED** must be answered before the task plan is created.
8. Questions marked **CAN DEFER** may use the recommended default.

Do not delete question IDs such as `Q1.1`; they will be referenced in the task plan.

## Confirmed Direction From Earlier Decisions

Please correct anything below that is wrong.

- The mobile app is for students.
- Students can discover, search, view, save, register for, share, and receive reminders for published events.
- Students cannot create or manage events and cannot access an organizer dashboard.
- Event creation and organizer management belong to a separate web portal.
- Team Finder is a mobile student feature independent of event teams.
- The first backend must support auth, profiles, events, posts, Team Finder, connections, chat, notifications, search, reporting, blocking, and account settings.
- The prototype must remain usable with mock data while real APIs are introduced incrementally.

**Q0.1 — REQUIRED: Is every confirmed direction above correct?**

- [x] Yes, all are correct
- [ ] No, corrections are written below

Answer: **Yes, all are correct**

Corrections: **None**

---

## 1. Product Goal and MVP Boundary

**Q1.1 — REQUIRED: In one or two sentences, what is the main problem CampusSphere solves?**

Answer: **CampusSphere solves the problem of fragmented and undiscoverable campus information by providing a single, verified, and moderated mobile-first platform. It unifies essential student workflows—such as announcements, academic resources, club events, and peer collaboration—into a trusted space that replaces scattered group chats and notice boards.**

**Q1.2 — REQUIRED: Who is the first target user?**

- [ ] Students at one college/university
- [x] Students at several selected colleges/universities
- [ ] Any verified university student
- [ ] Students and alumni
- [ ] Other

Answer: **Students at several selected colleges/universities**

**Q1.3 — REQUIRED: Where will the first pilot launch? List the campus/campuses, city, and country.**

Answer: **Any collage in India**

**Q1.4 — REQUIRED: Which mobile platforms are required for the first release?**

- [x] Android only
- [ ] iOS only
- [ ] Android and iOS
- [x] Expo development build only for the prototype

Answer: **Android only**

**Q1.5 — REQUIRED: What result would make the MVP successful? Select and add target numbers if known.**

- [x] Registered students
- [x] Weekly active students
- [x] Posts/comments per week
- [x] Team Finder applications or successful teams
- [x] Event registrations/reminders
- [x] Messages sent
- [x] User retention
- [x] Pilot feedback score
- [ ] Other

Targets: **No fixed targets**

**Q1.6 — REQUIRED: Is there a target date or deadline for the working MVP?**

Answer: **The enable features should be in working and foor testing within 7 days from today so the deadline is 15th August 2026**

**Q1.7 — REQUIRED: What is the expected pilot size?**

- [ ] Under 100 users
- [ ] 100–1,000 users
- [x] 1,000–10,000 users
- [ ] More than 10,000 users

Answer: **100-1000 users right now for this time but it was scalable to 10000 users so created for max users**

**Q1.8 — REQUIRED: Which existing prototype areas should remain visible in the MVP? Select all that apply.**

- [x] Home/feed
- [x] Events
- [x] Team Finder
- [x] Student discovery/connections
- [x] Chat
- [x] Notifications
- [x] Profile/settings
- [x] Notes
- [ ] Clubs
- [ ] Marketplace
- [ ] Opportunities/jobs
- [ ] Assistant
- [ ] Other

Answer: **Right now the selected ones are functional but the unslected alll are shown in under construction so i want that it should be in under construction but can be seen but not be functional**

**Q1.9 — REQUIRED: What should happen to non-MVP prototype areas?**

- [ ] Remove them from navigation
- [x] Show “Coming soon” pages
- [ ] Keep existing mock-only screens
- [ ] Decide separately for each area

Answer: **Show coming soon pages and disable all the functionality**

**Q1.10 — CAN DEFER: Is localization required in the MVP?**

- [x] English only (recommended for the first MVP)
- [ ] English plus Hindi
- [ ] Other languages

Answer: **English only right now**

**Q1.11 — CAN DEFER: Are formal accessibility targets required?**

- [x] Basic mobile accessibility and screen-reader labels (recommended minimum)
- [ ] WCAG 2.1 AA-equivalent mobile target
- [ ] Defer formal accessibility work

Answer: **Basic mobile accessibility and screen-reader labels right now and defer formal accessibility work**

---

## 2. Event Experience for Mobile Students

**Q2.1 — REQUIRED: Who can view events?**

- [x] Only signed-in students
- [ ] Anyone can view; sign-in is needed to save/register
- [ ] Depends on each event

Answer: **Only signed-in students can view events but not the admin**

**Q2.2 — REQUIRED: Which events can a student discover?**

- [x] Only events from the student's campus
- [ ] Student's campus plus nearby campuses
- [ ] All campuses on CampusSphere
- [ ] Public events plus campus-only events according to audience rules

Answer: **Only events from the student's campus right now**

**Q2.3 — REQUIRED: Which event actions belong in the MVP? Select all that apply.**

- [x] Browse upcoming events
- [x] Search events
- [x] Filter by date/category/campus/location
- [x] View event details
- [x] Save/bookmark an event
- [x] Mark interested
- [x] Open an external registration link
- [x] Cancel own registration
- [x] Share an event
- [x] Add event to device calendar
- [x] Open venue in maps
- [x] View past events
- [ ] Other

Answer: **All are selected but the only selected one will only functional for the MVP**

**Q2.4 — REQUIRED: How should event registration work?**

- [x] Internal CampusSphere registration only
- [ ] External registration links only
- [ ] Both, selected per event
- [ ] No registration in MVP; discovery/reminders only

Answer: **Internal CampusSphere registration only for now**

**Q2.5 — REQUIRED: What event registration states are needed?**

- [x] Registered and cancelled only
- [ ] Interested, registered, waitlisted, and cancelled
- [ ] Other

Answer: **Registered and cancelled only for now**

**Q2.6 — REQUIRED: Should registration enforce capacity and deadlines?**

- [x] Yes, including a waitlist
- [ ] Yes, reject registration when full
- [ ] No capacity enforcement in MVP

Answer: **Yes, Includes a waitlist if someone unregister then the queued one will registrated automatically and notify that person**

**Q2.7 — REQUIRED: How are event reminders enabled?**

- [ ] Automatically after registration
- [ ] Automatically after save or registration
- [ ] Student must explicitly enable a reminder
- [x] A default reminder is enabled but can be turned off

Answer: **A default reminder is enabled but can be turned off**

**Q2.8 — REQUIRED: Which reminder times are required? Select all that apply.**

- [x] 24 hours before
- [x] 2 hours before
- [x] 1 hour before
- [x] 15 minutes before
- [x] Student-selected time
- [x] Organizer-selected default

Answer: **24 hours before, 2 hours before, 1 hour before, 15 minutes before, Student-selected time, Organizer-selected default**

**Q2.9 — REQUIRED: What should happen when an event is changed or cancelled?**

Answer: **They will notify through push notification, and if someone is registered then he should unregister himself and if someone is in waitlist then he will be registered automatically**

**Q2.10 — REQUIRED: What public organizer information may students see on event details?**

- [x] Organizer/organization name
- [x] Logo
- [x] Website
- [x] Public email
- [x] Public phone number
- [x] Social links
- [ ] Other

Answer: **Organizer name and details should be visible to the students**

**Q2.11 — REQUIRED: Until the organizer web portal is connected, how should published event data enter the backend?**

- [x] Reviewed seed/import file or script (recommended)
- [ ] Temporary protected internal admin endpoint
- [ ] Use only existing mobile mock data
- [ ] Wait for the organizer portal
- [ ] Other

Answer: **Reviewed seed/import file or script (recommended)**

**Q2.12 — REQUIRED: Confirm the mobile permission boundary.**

- [x] Students can never create/edit/publish/cancel/manage events or access organizer dashboards
- [x] Some trusted students may receive organizer access later, but only through the web portal
- [ ] Other rule

Answer: **Students can never create/edit/publish/cancel/manage events or access organizer dashboards**

**Q2.13 — CAN DEFER: Can students comment on or chat inside an event?**

- [x] No event comments/chat in MVP (recommended)
- [ ] Event comments
- [ ] Event group chat
- [ ] Both

Answer: **No event comments/chat in MVP (recommended)**

**Q2.14 — CAN DEFER: Should events appear as linked cards inside posts/feed?**

- [x] Yes
- [ ] No
- [ ] Later

Answer: **Events should appear as linked cards inside posts/feed**

---

## 3. Authentication, Campus Verification, and Onboarding

**Q3.1 — REQUIRED: Which sign-in methods are required?**

- [x] Email OTP/passwordless code (recommended)
- [ ] Email and password
- [ ] Google
- [ ] Apple
- [ ] Phone OTP
- [ ] College SSO
- [ ] Other

Answer: **Email OTP/passwordless code (recommended)**

**Q3.2 — REQUIRED: Must a user use an official campus email address?**

- [ ] Yes, always
- [x] Yes where available; manual verification otherwise
- [x] No, any verified email can join
- [ ] Invite-only pilot

Answer: **Yes where available; manual verification otherwise**

**Q3.3 — REQUIRED: What happens when a campus email domain is unknown or unsupported?**

Answer: **The email address will be verified manually or the user can have option to register with there normal mail too**

**Q3.4 — REQUIRED: Can one account belong to more than one campus?**

- [x] No, one active campus per account for MVP
- [ ] Yes, multiple campuses
- [ ] Allow campus transfer through support

Answer: **No, one active campus per account for MVP**

**Q3.5 — REQUIRED: What information must onboarding collect? Select all required fields.**

- [x] Display name
- [x] Unique username
- [x] Campus
- [x] Course/degree
- [x] Department
- [x] Graduation year
- [x] Bio
- [x] Avatar
- [x] Skills
- [x] Interests
- [x] Location
- [x] Availability
- [x] Terms/privacy consent
- [x] Date of birth or age confirmation

Answer: **Display name, Unique username, Campus, Course/degree, Department, Graduation year, Bio, Avatar, Skills, Interests, Location, Availability, Terms/privacy consent, Date of birth or age confirmation**

**Q3.6 — REQUIRED: What is the minimum age for using the app?**

Answer: **16 years old**

**Q3.7 — REQUIRED: Can users skip optional onboarding and complete it later?**

- [x] Yes
- [ ] No, all selected onboarding fields are required
- [ ] Only some steps can be skipped

Answer: **Yes**

**Q3.8 — REQUIRED: Should usernames be unique globally or only within a campus?**

- [x] Globally unique (recommended)
- [ ] Unique within each campus

Answer: **Globally unique (recommended)**

**Q3.9 — REQUIRED: How long should a signed-in session last before requiring login again?**

Answer: **30 days**

**Q3.10 — REQUIRED: Should users see and revoke their signed-in devices/sessions?**

- [ ] Yes
- [x] No, only “log out everywhere”
- [ ] Defer

Answer: **No, only “log out everywhere” and also there is no sign out button**

**Q3.11 — CAN DEFER: Is two-factor authentication required beyond email OTP?**

- [x] No for MVP (recommended)
- [ ] Yes for every student
- [ ] Only for moderator/support accounts

Answer: **No for MVP (recommended)**

---

## 4. Profiles, Visibility, and Student Discovery

**Q4.1 — REQUIRED: Which profile fields are public to permitted viewers?**

Answer: **Display name, Unique username, Campus, Course/degree, Department, Graduation year, Bio, Avatar, Skills, Interests, Location, Availability**

**Q4.2 — REQUIRED: What is the default profile visibility?**

- [x] Same-campus students
- [x] Accepted connections only
- [ ] All verified CampusSphere students
- [x] Private until the user changes it

Answer: **Private until the user changes it**

**Q4.3 — REQUIRED: Can students make themselves undiscoverable in search and suggestions?**

- [x] Yes
- [ ] No
- [ ] Only through support

Answer: **Yes**

**Q4.4 — REQUIRED: Is cross-campus profile discovery allowed?**

- [ ] No for MVP
- [ ] Yes for all verified students
- [ ] Opt-in only
- [x] Only through Team Finder/event contexts

Answer: **Only through Team Finder/event contexts**

**Q4.5 — REQUIRED: Which student discovery filters are needed?**

- [x] Campus
- [x] Course/department
- [x] Graduation year
- [x] Skills
- [x] Interests
- [ ] Availability
- [ ] Connection status
- [ ] Other

Answer: **,Unique name, Campus, Course/department, Graduation year, Skills, Interests**

**Q4.6 — REQUIRED: Are profile links allowed?**

- [x] GitHub
- [x] LinkedIn
- [x] Portfolio/personal website
- [x] Instagram/social links
- [ ] No external links in MVP
- [ ] Other

Answer: **GitHub, LinkedIn, Portfolio/personal website, Instagram/social links**

**Q4.7 — CAN DEFER: Should profiles display connection, post, and team counts?**

- [x] Yes
- [ ] No
- [ ] Later

Answer: **Yes**

**Q4.8 — CAN DEFER: Should online status or last-seen time be visible?**

- [ ] No (recommended for privacy and smaller scope)
- [ ] Online only
- [ ] Online and last seen
- [ ] User-controlled

Answer: **No (recommended for privacy and smaller scope)**

**Q4.9 — CAN DEFER: Is any profile verification badge required?**

Answer: **No for MVP (recommended)**

---

## 5. Posts, Feed, Comments, Reactions, and Bookmarks

**Q5.1 — REQUIRED: Which post formats are included in MVP? Select all that apply.**

- [x] Text
- [x] Images
- [x] Links with preview
- [x] Polls
- [ ] Video
- [x] Documents
- [x] Event-linked cards
- [x] Team Finder-linked cards
- [ ] Other

Answer: **Text, Images, Links with preview, Polls, Documents, Event-linked cards, Team Finder-linked cards**

**Q5.2 — REQUIRED: What is the maximum post length?**

Answer: **2000 characters**

**Q5.3 — REQUIRED: Who can see a post? Select the visibility choices a post author can use.**

- [x] Same campus
- [x] Connections only
- [x] All verified students
- [x] Specific team
- [x] Private/draft
- [x] Other

Answer: **Same campus, Connections only, All verified students, Specific team, Private/draft, Other(If the Post option is Global)**

**Q5.4 — REQUIRED: How should the initial feed be ordered?**

- [x] Newest first (recommended MVP baseline)
- [ ] Basic relevance plus recency
- [ ] Separate Latest and Recommended feeds
- [ ] Other

Answer: **Newest first (recommended MVP baseline)**

**Q5.5 — REQUIRED: Which reactions are allowed?**

- [x] Like only
- [x] A small fixed set of reactions
- [x] Any emoji
- [x] No reactions

Answer: **Like only, A small fixed set of reactions, Any emoji, No reactions**

**Q5.6 — REQUIRED: How should comments work?**

- [x] Flat comments only
- [x] One level of replies
- [x] Unlimited nested replies
- [ ] Comments disabled in MVP

Answer: **Flat comments only, One level of replies, Unlimited nested replies**

**Q5.7 — REQUIRED: Can authors edit posts and comments after publishing?**

Answer: **Yes**

**Q5.8 — REQUIRED: Can authors delete their posts/comments? Should the UI show “deleted” placeholders?**

Answer: **Yes**

**Q5.9 — REQUIRED: Are bookmarks private?**

- [x] Yes (recommended)
- [ ] No

Answer: **Yes**

**Q5.10 — CAN DEFER: Are reposts/quotes required?**

- [x] No for MVP (recommended)
- [ ] Simple repost
- [ ] Quote repost
- [ ] Both

Answer: **No for MVP (recommended)**

**Q5.11 — CAN DEFER: Should posts support hashtags and mentions?**

Answer: **Yes**

**Q5.12 — REQUIRED if images are enabled: What are the limits per post?**

- Maximum images: **5 images**
- Maximum file size: **20MB**
- Allowed formats: **JPEG, PNG, GIF**

---

## 6. Team Finder

**Q6.1 — REQUIRED: What types of teams can students create? Select all that apply.**

- [x] Projects
- [x] Hackathons/competitions
- [x] Study groups
- [x] Startups
- [x] Research
- [x] Sports/activities
- [x] General custom purpose
- [x] Other

Answer: **Projects, Hackathons/competitions, Study groups, Startups, Research, Sports/activities, General custom purpose, Other**

**Q6.2 — REQUIRED: Are Team Finder requests limited to the student's campus?**

- [ ] Yes for MVP
- [x] No, cross-campus teams are allowed
- [ ] Owner chooses

Answer: **No, cross-campus teams are allowed**

**Q6.3 — REQUIRED: Which fields are required when creating a team request?**

- [x] Title
- [x] Description/goal
- [x] Team type
- [x] Required skills
- [x] Preferred skills
- [x] Interests
- [x] Desired member count
- [x] Commitment level
- [x] Availability/schedule
- [x] Application deadline
- [x] Target completion date
- [x] Other

Answer: **Title, Description/goal, Team type, Required skills, Preferred skills, Interests, Desired member count, Commitment level, Availability/schedule, Application deadline, Target completion date, Other**

**Q6.4 — REQUIRED: What are the minimum and maximum team sizes?**

Answer: **Minimum size: 2, Maximum size: 10**

**Q6.5 — REQUIRED: How does a student join a team?**

- [x] Apply and owner approves
- [x] Instant join until full
- [x] Owner can choose per request
- [x] Invitation only

Answer: **Apply and owner approves, Instant join until full, Owner can choose per request, Invitation only**

**Q6.6 — REQUIRED: What should an application contain?**

- [x] Message only
- [x] Message plus selected skills
- [x] Profile only; no message
- [x] Custom answers/questions
- [x] Other

Answer: **Message only, Message plus selected skills, Profile only; no message, Custom answers/questions, Other**

**Q6.7 — REQUIRED: Can an applicant withdraw? Can they reapply after rejection?**

Answer: **Yes**

**Q6.8 — REQUIRED: What can a team owner do? Select all that apply.**

- [x] Accept/reject applications
- [x] Remove members
- [x] Close/reopen recruitment
- [x] Edit team request
- [x] Transfer ownership
- [x] Delete/cancel team
- [x] Invite students
- [x] Other

Answer: **Accept/reject applications, Remove members, Close/reopen recruitment, Edit team request, Transfer ownership, Delete/cancel team, Invite students, Other**

**Q6.9 — REQUIRED: When is team chat created?**

- [x] Immediately when the team request is created
- [x] When the first member is accepted
- [x] Owner creates it manually

Answer: **Immediately when the team request is created, When the first member is accepted, Owner creates it manually**

**Q6.10 — REQUIRED: Should open requests expire automatically?**

- [x] Yes for MVP (recommended)
- [ ] No
- [ ] Owner chooses

Answer: **Yes for MVP (recommended)**

**Q6.11 — REQUIRED: Confirm Team Finder is independent from event teams.**

- [x] Yes, no event ID or organizer permission is required
- [ ] Some teams may reference an event but remain student-owned
- [ ] Other

Answer: **Yes, no event ID or organizer permission is required**

**Q6.12 — CAN DEFER: How should team matches be ranked?**

- [x] Required/preferred skill and interest overlap (recommended)
- [ ] Newest requests first
- [ ] Manual filters only
- [ ] Other

Answer: **Required/preferred skill and interest overlap (recommended)**

---

## 7. Connections and Student Relationships

**Q7.1 — REQUIRED: Is a connection request required before students become connected?**

- [ ] Yes
- [ ] No, following model
- [x] Both connections and following

Answer: **Both connections and following**

**Q7.2 — REQUIRED: Which connection states are needed?**

- [x] Pending, accepted, declined, removed
- [x] Add cancelled/withdrawn
- [x] Add blocked
- [x] Other

Answer: **Pending, accepted, declined, removed, Add cancelled/withdrawn, Add blocked, Other**

**Q7.3 — REQUIRED: Can users send another request after a decline or removal? If yes, after how long?**

Answer: **Yes**

**Q7.4 — REQUIRED: Who can see a student's connections?**

- [ ] Only that student
- [ ] Accepted connections
- [ ] Same-campus students
- [ ] Everyone permitted to view the profile
- [x] User-controlled

Answer: **User-controlled**

**Q7.5 — CAN DEFER: What should power connection suggestions?**

- [x] Shared campus, skills, interests, and mutual connections
- [ ] Same campus only
- [ ] Manual search only
- [ ] Other

Answer: **Shared campus, skills, interests, and mutual connections**

---

## 8. Chat and Realtime Messaging

**Q8.1 — REQUIRED: Who can start a direct chat?**

- [x] Accepted connections only (recommended)
- [ ] Any same-campus student
- [ ] Anyone, using message requests
- [ ] Team members only

Answer: **Accepted connections only (recommended)**

**Q8.2 — REQUIRED: Which chat types are included?**

- [x] Direct one-to-one chat
- [x] Team chat
- [x] General group chat created by students
- [x] Event chat
- [x] Other

Answer: **Direct one-to-one chat, Team chat, General group chat created by students, Event chat, Other**

**Q8.3 — REQUIRED: Which message types are included?**

- [x] Text
- [ ] Images
- [x] Files/documents
- [x] Links
- [ ] Voice notes
- [x] GIFs/stickers
- [x] System messages
- [x] Other

Answer: **Text, Files/documents, Links, GIFs/stickers, System messages, Other**

**Q8.4 — REQUIRED: Can senders edit messages?**

- [ ] No
- [ ] Yes, without a time limit
- [x] Yes, within a limited time

Answer: **Yes, within a limited time**

**Q8.5 — REQUIRED: How should message deletion work?**

- [ ] Delete for self only
- [x] Delete for everyone within a time limit
- [ ] Delete for everyone anytime
- [ ] No user deletion

Answer: **Delete for everyone within a time limit**

**Q8.6 — REQUIRED: Are these features required?**

| Feature | Yes/No/Later |
| --- | --- |
| Read receipts | **Yes** |
| Unread counts | **Yes** |
| Typing indicator | **Yes** |
| Online presence | **Yes** |
| Reply to message | **Yes** |
| Message reactions | **Yes** |
| Search messages | **Yes** |

**Q8.7 — REQUIRED: What happens when a member leaves or is removed from a team? Can they read old messages?**

Answer: **No**

**Q8.8 — REQUIRED: What should happen when one user blocks another but both are in the same team chat?**

- [x] Keep both in team chat but hide/suppress direct interaction
- [ ] Remove the blocked user from the shared team
- [ ] Remove the blocker from the shared team
- [ ] Ask team owner/moderator to resolve
- [ ] Other

Answer: **Keep both in team chat but hide/suppress direct interaction**

**Q8.9 — REQUIRED: Should message content appear in push notifications by default?**

- [ ] Yes
- [ ] No, show only “New message”
- [x] User-controlled

Answer: **User-controlled**

**Q8.10 — REQUIRED: How long should chat messages be retained?**

Answer: **User-controlled**

**Q8.11 — CAN DEFER: Are audio/video calls required?**

- [x] No for MVP (recommended)
- [ ] Audio calls
- [ ] Video calls
- [ ] Both

Answer: **No for MVP (recommended)**

---

## 9. Notifications and Reminders

**Q9.1 — REQUIRED: Which delivery channels are required?**

- [x] In-app notifications
- [ ] Mobile push notifications
- [x] Email notifications
- [ ] SMS

Answer: **In-app notifications, Email notifications**

**Q9.2 — REQUIRED: Which actions should generate notifications? Select all that apply.**

- [x] Connection request
- [x] Connection accepted
- [x] Post reaction
- [x] Post comment/reply
- [x] Team application received
- [x] Team application accepted/rejected
- [x] Team membership changes
- [x] Direct/team message
- [x] Event registration confirmation
- [x] Event reminder
- [x] Event time/venue update
- [x] Event cancellation
- [x] Safety/account notice
- [x] Other

Answer: **Connection request, Connection accepted, Post reaction, Post comment/reply, Team application received, Team application accepted/rejected, Team membership changes, Direct/team message, Event registration confirmation, Event reminder, Event time/venue update, Event cancellation, Safety/account notice, Other**

**Q9.3 — REQUIRED: Can users control notification categories separately?**

- [x] Yes, in-app and push separately
- [ ] Yes, one switch per category
- [ ] One master switch only
- [ ] No preferences in MVP

Answer: **Yes, in-app and push separately**

**Q9.4 — CAN DEFER: Are quiet hours required?**

Answer: **Yes**

**Q9.5 — CAN DEFER: Should noisy notifications such as reactions be grouped/batched?**

Answer: **Yes**

**Q9.6 — REQUIRED: How long should notification history remain visible?**

Answer: **User-controlled**

---

## 10. Search and Discovery

**Q10.1 — REQUIRED: What can users search?**

- [x] Profiles
- [x] Events
- [x] Posts
- [x] Team Finder requests
- [x] Chats/messages
- [x] Other

Answer: **Profiles, Events, Posts, Team Finder requests, Chats/messages, Other**

**Q10.2 — REQUIRED: Should search be limited to the user's campus? Define the rule for each searchable type.**

Answer: **Yes,But if the cross campus post and other are global then they can visisbble too**

**Q10.3 — REQUIRED: Which filters are needed for each search type?**

Answer: **Yes**

**Q10.4 — CAN DEFER: Are autocomplete and search suggestions required?**

Answer: **Yes**

**Q10.5 — CAN DEFER: Should recent searches be stored?**

- [ ] No
- [x] On device only
- [ ] In the backend per user

Answer: **On device only**

**Q10.6 — REQUIRED: Should blocked, private, removed, cancelled, or cross-campus content ever appear in search?**

Answer: **No, But exCept the cross-campus content can appear**

---

## 11. Blocking, Reporting, Moderation, and Support

**Q11.1 — REQUIRED: What can a student report?**

- [x] User/profile
- [x] Post
- [x] Comment
- [x] Message
- [x] Team request/application
- [x] Event
- [ ] Other

Answer: **User/profile, Post, Comment, Message, Team request/application, Event, Other**

**Q11.2 — REQUIRED: Which report reasons are needed?**

- [x] Spam/scam
- [x] Harassment/bullying
- [x] Hate or discrimination
- [x] Sexual content
- [x] Violence/threats
- [x] Self-harm concern
- [x] Impersonation
- [x] Privacy violation
- [x] False/misleading event
- [x] Illegal activity
- [x] Other

Answer: **Spam/scam, Harassment/bullying, Hate or discrimination, Sexual content, Violence/threats, Self-harm concern, Impersonation, Privacy violation, False/misleading event, Illegal activity, Other**

**Q11.3 — REQUIRED: Who will review reports during the pilot?**

Answer: **Pilot Team or admins**

**Q11.4 — REQUIRED: What response time is expected for urgent and normal reports?**

Answer: **Within 24 hours**

**Q11.5 — REQUIRED: Which moderation actions are needed?**

- [x] Dismiss report
- [x] Hide/remove content
- [x] Warn user
- [x] Temporarily suspend account
- [x] Permanently ban account
- [x] Restrict posting/chat
- [x] Escalate to campus/safety contact
- [x] Other

Answer: **Dismiss report, Hide/remove content, Warn user, Temporarily suspend account, Permanently ban account, Restrict posting/chat, Escalate to campus/safety contact, Other**

**Q11.6 — REQUIRED: Should content be automatically hidden after multiple reports?**

- [ ] No; manual review only
- [x] Yes, after a defined threshold
- [ ] Only for high-risk categories

Answer: **Yes, after a defined threshold**

**Q11.7 — REQUIRED: What must blocking do? Select all that apply.**

- [x] Hide profiles from each other
- [x] Hide posts/comments from each other
- [ ] Prevent connection requests
- [ ] Cancel existing pending connection requests
- [ ] Remove accepted connection
- [x] Prevent direct chat/messages
- [x] Prevent Team Finder applications
- [x] Suppress shared-team interaction
- [x] Other

Answer: **Hide profiles from each other, Hide posts/comments from each other, Prevent connection requests, Cancel existing pending connection requests, Remove accepted connection, Prevent direct chat/messages, Prevent Team Finder applications, Suppress shared-team interaction, Other**

**Q11.8 — REQUIRED: Can a reported/suspended user appeal?**

Answer: **Yes**

**Q11.9 — CAN DEFER: Is automated text/image moderation required for MVP?**

- [ ] Basic spam/rate-limit controls only
- [ ] Automated text moderation
- [ ] Automated image moderation
- [ ] Both text and image moderation

Answer: **Basic spam/rate-limit controls only**

**Q11.10 — REQUIRED: Are moderator/support accounts separate from organizer accounts?**

- [x] Yes, completely separate roles and permissions (recommended)
- [ ] No
- [ ] Other

Answer: **Yes, completely separate roles and permissions (recommended)**

---

## 12. Account, Privacy, Legal, and Data Retention

**Q12.1 — REQUIRED: In which country/jurisdiction will the product and first users operate?**

Answer: **India**

**Q12.2 — REQUIRED: Are privacy policy and terms of service already available?**

- [x] Yes; provide paths/links below
- [ ] No; they must be created before pilot launch
- [ ] Pilot/internal testing does not yet require final documents

Answer/links: **[Privacy Policy](https://www.privacypolicygenerator.info/live.php?token=iB91yvI5WzJkS14d4l1YtEa95O0XG2g0)**

**Q12.3 — REQUIRED: How should account deletion work?**

- [x] Immediate disable plus delayed permanent deletion
- [ ] Immediate permanent deletion where possible
- [ ] Support-reviewed deletion
- [ ] Other

Answer: **Immediate disable plus delayed permanent deletion**

**Q12.4 — REQUIRED: What deletion grace period and data-retention period should be used?**

Answer: **Immediate disable plus delayed permanent deletion**

**Q12.5 — REQUIRED: Must users be able to export/download their data?**

- [x] Yes in MVP
- [ ] Yes before public launch, not initial pilot
- [ ] No/unknown

Answer: **Yes in MVP**

**Q12.6 — REQUIRED: Which records may be retained after account/content deletion for safety, legal, or audit purposes?**

Answer: **Account & profile data, Connection data, Event registration data, Content data, etc.**

**Q12.7 — REQUIRED: Is parental consent needed for any expected users?**

Answer: **No**

**Q12.8 — CAN DEFER: Is a specific data residency region required?**

Answer: **No**

---

## 13. Backend Stack and Repository Decisions

For technical questions, `USE RECOMMENDATION` is a valid answer.

**Q13.1 — REQUIRED: Backend framework/language?**

- [ ] NestJS + TypeScript modular monolith (recommended)
- [ ] Express/Fastify + TypeScript
- [x] Supabase-only backend functions/database
- [ ] Python/FastAPI
- [ ] Other

Answer: **NestJS + TypeScript modular monolith (recommended),supabase-only backend functions/database**

**Q13.2 — REQUIRED: Database?**

- [ ] PostgreSQL (recommended)
- [x] Supabase-managed PostgreSQL
- [ ] Another managed PostgreSQL provider
- [ ] Other

Answer: **Supabase-managed PostgreSQL**

**Q13.3 — REQUIRED: Authentication provider?**

- [x] Supabase Auth with email OTP (recommended)
- [ ] Firebase Auth
- [ ] Clerk/Auth0
- [ ] Custom auth
- [ ] Other

Answer: **Supabase Auth with email OTP (recommended)**

**Q13.4 — REQUIRED: Realtime chat provider?**

- [x] Supabase Realtime (recommended for initial compatibility)
- [ ] NestJS WebSocket gateway
- [ ] Third-party chat provider
- [ ] Other

Answer: **Supabase Realtime (recommended for initial compatibility)**

**Q13.5 — REQUIRED: ORM/database migration tool?**

- [ ] Prisma
- [ ] Drizzle
- [ ] TypeORM
- [x] Supabase SQL migrations plus query client
- [ ] Use recommendation

Answer: **Supabase SQL migrations plus query client**

**Q13.6 — REQUIRED: Where should backend code live?**

- [x] `backend/` in this workspace (recommended, least disruption)
- [ ] `apps/api/` and convert to a monorepo
- [ ] Separate repository
- [ ] Other

Answer: **`backend/` in this workspace (recommended, least disruption)**

**Q13.7 — REQUIRED: Which package manager should be used?**

- [ ] npm
- [x] pnpm
- [ ] yarn
- [ ] Match the prototype's existing choice

Answer: **pnpm**

**Q13.8 — REQUIRED if media is enabled: Object storage provider?**

- [x] Supabase Storage
- [ ] AWS S3
- [ ] Cloudflare R2
- [ ] Other S3-compatible provider
- [ ] Use recommendation

Answer: **Supabase Storage**

**Q13.9 — REQUIRED: Push-notification path?**

- [x] Expo Push Service for MVP (recommended for Expo app)
- [ ] Direct FCM/APNs
- [ ] Other

Answer: **Expo Push Service for MVP (recommended for Expo app)**

**Q13.10 — CAN DEFER: Is Redis approved?**

- [x] Not initially; add only when jobs/rate limiting require it (recommended)
- [ ] Yes from the beginning
- [ ] No Redis

Answer: **Not initially; add only when jobs/rate limiting require it (recommended)**

**Q13.11 — REQUIRED: Should the backend generate an OpenAPI specification and typed mobile client?**

- [x] Yes (recommended)
- [ ] OpenAPI only
- [ ] No generated contract

Answer: **Yes (recommended)**

---

## 14. API, Realtime, Jobs, and Offline Behavior

**Q14.1 — REQUIRED: API style?**

- [x] REST `/v1` (recommended)
- [ ] GraphQL
- [ ] Mixed REST and GraphQL
- [ ] Other

Answer: **REST `/v1` (recommended)**

**Q14.2 — CAN DEFER: Pagination preference?**

- [x] Cursor pagination for feeds/messages/search (recommended)
- [ ] Page/offset pagination
- [ ] Use recommendation

Answer: **Cursor pagination for feeds/messages/search (recommended)**

**Q14.3 — REQUIRED: Which mobile actions must work offline?**

- [x] Read previously loaded data only
- [x] Queue posts/comments/messages while offline
- [ ] Save drafts only
- [ ] No formal offline support in MVP
- [ ] Other

Answer: **Read previously loaded data only,Queue posts/comments/messages while offline**

**Q14.4 — REQUIRED: What should the app do when a session expires during use?**

Answer: **when during the use the app should not close**

**Q14.5 — CAN DEFER: Which background jobs are required initially?**

- [x] Event reminders
- [x] Push notifications
- [x] Email delivery
- [x] Media processing/moderation
- [x] Account deletion cleanup
- [x] Search indexing
- [ ] Other

Answer: **Event reminders,Push notifications,Email delivery,Media processing/moderation,Account deletion cleanup,Search indexing**

**Q14.6 — CAN DEFER: How long must older mobile app versions remain API-compatible?**

Answer: **at least 2 versions**

**Q14.7 — REQUIRED: Should important retryable writes use idempotency keys?**

- [ ] Yes (recommended)
- [ ] No
- [x] Use recommendation

Answer: **Use recommendation**

---

## 15. Hosting, Environments, Budget, and Operations

**Q15.1 — REQUIRED: Preferred cloud/hosting provider?**

- [x] Supabase plus a Node hosting provider
- [ ] AWS
- [ ] Azure
- [ ] Google Cloud
- [ ] Railway/Render/Fly.io
- [ ] No preference; recommend one
- [ ] Other

Answer: **Supabase plus a Node hosting provider**

**Q15.2 — REQUIRED: Monthly infrastructure budget for MVP/pilot?**

Answer: **Right now i have zero budget**

**Q15.3 — REQUIRED: Which environments are required?**

- [x] Local
- [x] Shared development
- [x] Staging
- [x] Production
- [x] Preview environments per change

Answer: **Local,shared development,Staging,Production**

**Q15.4 — REQUIRED: Is a domain/subdomain available for the API?**

Answer: **No**

**Q15.5 — REQUIRED: Where is the source repository hosted or where will it be hosted?**

- [x] GitHub
- [ ] GitLab
- [ ] Azure DevOps
- [ ] Local only for now
- [ ] Other

Answer: **GitHub**

**Q15.6 — REQUIRED: Which CI/CD system should be used?**

- [x] GitHub Actions
- [ ] GitLab CI
- [ ] Azure Pipelines
- [ ] Provider-native deployment
- [x] Use recommendation

Answer: **Use recommendation**

**Q15.7 — REQUIRED: Who will own production access, secrets, billing, and emergency decisions?**

Answer: **me**

**Q15.8 — CAN DEFER: Required database backup and recovery target?**

Answer: **Use recommendation**

**Q15.9 — CAN DEFER: Which monitoring/error tools are acceptable?**

- [ ] Sentry
- [ ] Provider-native logs/metrics
- [ ] OpenTelemetry plus a monitoring service
- [ ] Use recommendation
- [ ] Other

Answer: **Use recommendation**

**Q15.10 — CAN DEFER: Do you already have accounts/projects for Supabase, Expo, push providers, cloud hosting, or email delivery? Do not put secrets here.**

Answer: **yes and give me all account recommends that give free services**

---

## 16. Mock Data, Existing Prototype, and Migration

**Q16.1 — REQUIRED: Must the current prototype remain fully usable with mock data throughout development?**

- [ ] Yes
- [ ] Only until the first real API vertical slice
- [x] No; switch completely once backend work starts

Answer: **No; switch completely once backend work Complete**

**Q16.2 — REQUIRED: Should mock mode remain after production launch for demos/tests?**

- [ ] Yes, but impossible to enable in production builds
- [ ] Tests only
- [x] Remove it before launch

Answer: **Remove it before launch**

**Q16.3 — REQUIRED: Should existing mock users/posts/events/teams be preserved as development seed data?**

Answer: **Yes of course seed the mock data**

**Q16.4 — REQUIRED: Confirm what Phase 1 removes from mobile.**

- [x] Organizer routes/dashboard
- [x] Professional/organizer access request screen
- [x] Organizer roles and badges
- [x] Event create/edit/manage controls
- [x] Event teams tied to organizer/event management

Answer: **Yes Phase 1 removes all the organizer and professional routes/dashboard and also all the organizer and professional controls and features**

**Q16.5 — REQUIRED: Confirm what Phase 1 preserves in mobile.**

- [x] Event discovery/list
- [x] Event details
- [x] Event save/registration
- [x] Event reminders
- [x] Team Finder

Answer: **Phase 1 preserves event discovery/list,event details,event save/registration,event reminders,team finder**

**Q16.6 — REQUIRED: Preferred real-API cutover order.**

Suggested order:

1. Auth and `/me`
2. Onboarding/profiles
3. Events
4. Posts/feed
5. Team Finder
6. Connections
7. Chat
8. Notifications
9. Search
10. Blocking/reporting/settings

Answer: **Auth and `/me`,Onboarding/profiles,Events,Posts/feed,Team Finder,Connections,Chat,Notifications,Search,Blocking/reporting/settings**

**Q16.7 — REQUIRED: Is any real existing user/event/content data being migrated, or is this a clean start?**

Answer: **this is a clean start no real existing user/event/content data is being migrated**

---

## 17. Analytics and Product Measurement

**Q17.1 — REQUIRED: Is product analytics required in the MVP?**

- [ ] Yes
- [ ] No
- [ ] Pilot metrics can be derived from backend data only

Answer: **No i want to use self-hosted analytics for now**

**Q17.2 — REQUIRED if analytics are enabled: Which tool is preferred?**

- [ ] PostHog
- [ ] Firebase Analytics
- [ ] Amplitude
- [ ] Mixpanel
- [x] Self-hosted/basic internal events
- [ ] Use recommendation

Answer: **Self-hosted/basic internal events**

**Q17.3 — REQUIRED: Which product actions must be measured?**

- [x] Signup and onboarding completion
- [x] Daily/weekly active users
- [x] Event discovery/save/registration/reminder conversion
- [x] Post creation/engagement
- [x] Team request/application/success
- [x] Connection creation
- [x] Chat engagement
- [x] Retention
- [x] Reports/blocks
- [x] Other

Answer: **Yes all the above mentioned product actions must be measured at the end of the Admin dashborad**

**Q17.4 — REQUIRED: Is user consent required before non-essential analytics?**

Answer: **Yes user consent is required before non-essential analytics**

---

## 18. Testing, Performance, and Release Quality

**Q18.1 — REQUIRED: What quality level is expected for the first pilot?**

- [ ] Internal prototype: major flows work, limited hardening
- [x] Closed pilot: production-like auth, safety, backups, and monitoring
- [ ] Public MVP: full launch readiness

Answer: **Closed pilot: production-like auth, safety, backups, and monitoring**

**Q18.2 — REQUIRED: Which automated tests are mandatory?**

- [x] Backend unit tests
- [x] Database integration tests
- [x] API contract tests
- [x] Authorization/security tests
- [x] Realtime chat tests
- [x] Mobile component tests
- [x] Mobile end-to-end tests
- [x] Load tests

Answer: **All of the above**

**Q18.3 — REQUIRED: Which devices/OS versions must be tested?**

Answer: **iOS: 17 and above, Android: 14 and above**

**Q18.4 — REQUIRED: Expected performance/load target?**

- Concurrent users: **100**
- API response target: **200ms**
- Chat delivery target: **500ms**

**Q18.5 — REQUIRED: Who approves a staging build for release?**

Answer: **i will**

**Q18.6 — CAN DEFER: Is an external security review required before launch?**

Answer: **i don't think it is required for now**

---

## 19. Delivery Workflow and Task-Plan Format

**Q19.1 — REQUIRED: Who will implement the MVP?**

- [x] Codex with your review/approval
- [ ] You and Codex together
- [ ] A development team using the task document
- [ ] Other

Answer: **Codex with my review/approval**

**Q19.2 — REQUIRED: How should the future task document be organized?**

- [x] Phases → epics → tasks → acceptance criteria (recommended)
- [ ] Weekly sprints
- [ ] Feature-by-feature checklist
- [ ] Backend tasks and mobile tasks separated
- [ ] Other

Answer: **Phases → epics → tasks → acceptance criteria (recommended)**

**Q19.3 — REQUIRED: How small should individual tasks be?**

- [x] About 1–4 hours each
- [ ] About one developer day each
- [ ] Larger feature tasks with subtasks

Answer: **1-4 hours each**

**Q19.4 — REQUIRED: Should every task include these fields? Select all required fields.**

- [x] Task ID
- [x] Objective
- [x] Dependencies
- [x] Files/modules affected
- [x] Implementation notes
- [x] Acceptance criteria
- [x] Tests required
- [x] Risk/rollback notes
- [x] Estimate
- [x] Status checkbox
- [x] Approval gate

Answer: **Yes all the above mentioned fields are required in each task**

**Q19.5 — REQUIRED: Should implementation stop for approval after each phase or continue automatically after tests pass?**

- [x] Stop after every phase for approval
- [ ] Stop only at major product/architecture gates
- [ ] Continue through the complete approved task plan

Answer: **Stop after every phase for approval**

**Q19.6 — REQUIRED: What should be implemented first after the task plan is approved?**

- [x] Mobile organizer/event-management cleanup
- [ ] Backend scaffold/foundation
- [ ] Auth vertical slice
- [ ] Another priority

Answer: **Mobile organizer/event-management cleanup**

**Q19.7 — REQUIRED: May implementation create or configure external services, or must it stop and ask first?**

- [x] Always ask before creating external services/resources
- [ ] Approved providers/resources may be created after a preview
- [ ] Other

Answer: **Always ask before creating external services/resources**

**Q19.8 — REQUIRED: Should the future task plan include estimates and a target schedule?**

- [ ] Include effort estimates only
- [x] Include effort and calendar schedule
- [ ] No estimates

Answer: **Include effort and calendar schedule**

---

## 20. Final Priorities and Approval

**Q20.1 — REQUIRED: Rank these areas from highest to lowest priority.**

- Auth/onboarding: **1**
- Profiles/student discovery: **2**
- Events/reminders: **3**
- Posts/feed: **4**
- Team Finder: **5**
- Connections: **6**
- Chat: **7**
- Notifications: **8**
- Search: **9**
- Reporting/blocking/moderation: **10**

**Q20.2 — REQUIRED: If time or budget runs short, which features may be postponed?**

Answer: **Right nnow there nothing worries about it**

**Q20.3 — REQUIRED: Which features must not be compromised or postponed?**

Answer: **Same as above**

**Q20.4 — REQUIRED: List any design, product, technical, budget, legal, or deadline constraint not covered above.**

Answer: **No constraint**

**Q20.5 — REQUIRED: May Codex use the completed answers plus the existing backend plan to create `docs/mvp_implementation_tasks.md`?**

- [ ] Yes
- [ ] No, ask more questions first

Answer: **Yes**

**Q20.6 — REQUIRED: How should Codex proceed after creating the task document?**

- [ ] Stop and ask me what to do next
- [ ] Recommend the first task, then ask for approval
- [ ] Other

Answer: **Recommend the first task, then ask for approval**

## Completion Check

- [x] I answered every **REQUIRED** question.
- [x] I used `USE RECOMMENDATION` where I want Codex to choose a sensible technical default.
- [x] I reviewed the confirmed mobile-event/organizer boundary.
- [x] I am ready for Codex to read this file and create the MVP task document.

Completed by: **[WRITE HERE]**  
Completion date: **[WRITE HERE]**

## What Happens Next

After you fill this file, tell Codex: `I completed the MVP questionnaire. Read it and create the task MD.`

Codex will then:

1. Read every answer.
2. Identify contradictions or missing required decisions.
3. Ask follow-up questions only if a missing answer materially changes the implementation.
4. Create `docs/mvp_implementation_tasks.md` with phases, dependencies, task IDs, acceptance criteria, tests, risks, and approval gates.
5. Stop and ask what you want to do next.
