# CampusSphere Mobile Cleanup and Backend MVP Plan

**Status:** Draft for product and technical review  
**Created:** 8 August 2026  
**Revised:** 8 August 2026 — attendee events retained on mobile; organizer controls remain web-only  
**Implementation status:** Not started  
**Approval required before code changes:** Yes

## 1. Purpose

This document defines the proposed work required to:

1. Remove organizer access and event creation/management options from the CampusSphere mobile prototype.
2. Preserve student-facing event discovery, details, registration/saving, and reminders in mobile.
3. Keep organizer dashboards and event authoring/management exclusively in a separate web product.
4. Replace the mobile prototype's in-memory mock backend with a production-ready backend.
5. Deliver a working mobile MVP centered on authentication, student profiles, events, posts, Team Finder, connections, chat, notifications, search, and safety controls.

This is a review document. No organizer-boundary cleanup or backend implementation should begin until the scope and open decisions in Section 22 are approved.

## 2. Current Product Decision

The mobile app is a student-only product.

- The mobile app will contain the student/attendee event experience: discovery, search and filters, event details, save/bookmark, registration or RSVP, sharing/deep links, and event reminders.
- The mobile app will not contain organizer roles, organizer access requests, organizer workspaces, event creation, event editing, attendee management, check-in tools, organizer announcements, event analytics, or organizer dashboards.
- Organizer event authoring and management will belong to a separate desktop-first web portal. That portal is outside this mobile backend MVP, but its published events must use a contract/data source consumable by the mobile event API.
- Team Finder remains in the mobile app, but it must be independent of events. A team is created around a student goal, project, competition, study topic, startup idea, or other student-defined purpose.
- Backend permissions for the mobile MVP are based on authenticated student membership and moderation responsibilities, not organizer roles.

The defining boundary is **attendee access on mobile, organizer control on web**. Hiding organizer buttons is not sufficient; mobile student tokens must be rejected by all organizer write and dashboard APIs.

## 3. MVP Goals

The backend MVP must support a complete, testable path for a student to:

1. Create and verify an account.
2. Complete onboarding and build a discoverable profile.
3. Discover, search, filter, view, save, register for, and receive reminders about published events.
4. Publish, browse, react to, save, comment on, and report posts.
5. Create or discover a Team Finder request.
6. Apply to a team, accept or reject applications, and manage team membership.
7. Discover students and send, accept, decline, or remove connections.
8. Start direct or team conversations and exchange messages in real time.
9. Receive in-app and push notifications.
10. Search for students, events, posts, and team requests.
11. Block users, report harmful content, and control privacy and notification preferences.

The backend should be simple enough to ship as an MVP but structured so individual modules can be separated later if scale requires it.

## 4. Scope

### 4.1 Included in the mobile MVP

- Email/OTP authentication and session handling
- Student onboarding and campus verification
- Student profiles, skills, interests, links, and discoverability settings
- Event discovery, search/filtering, event details, saving, registration/RSVP, and reminders
- Posts, feed, comments, reactions, bookmarks, and basic media attachments
- Team Finder requests, applications, members, and team chat
- Student discovery and connections
- Direct and team chat
- In-app notifications and mobile push notifications
- Search across profiles, events, posts, and Team Finder requests
- User blocking, content reporting, moderation state, and audit records
- Account, privacy, security, and notification settings
- Health checks, structured logging, metrics, backups, migrations, and CI/CD
- Mock fixtures for local development and automated tests

### 4.2 Explicitly excluded from the mobile MVP

- Organizer access requests, organizer roles, and organizer workspaces
- Mobile event creation, editing, publishing, cancellation, attendee management, check-in, announcements, organizer analytics, and event teams
- Web organizer/admin portal implementation
- Club management
- Marketplace and payments
- AI assistant features
- Notes/document sharing
- Job or opportunity management
- Machine-learning recommendations
- Audio/video calls and group voice rooms
- End-to-end encrypted chat in the first MVP

Excluded student-facing prototype areas can either be hidden for the MVP or planned separately. The exact treatment of Notes, Clubs, Marketplace, Opportunities, and Assistant is an approval item.

## 5. Mobile Prototype Cleanup Plan

The cleanup should be performed as a dedicated change before connecting production APIs. It must remove organizer capabilities without damaging the existing attendee-facing event experience.

### 5.1 Remove organizer access

Remove or revise the following mobile behavior:

- Organizer route group under `prototype/app/organizer/`
- Professional/organizer access settings screen
- Organizer access request UI and account request types
- Organizer role checks and role-specific quick actions
- Organizer workspace/request banners
- Organizer badges shown on student profiles
- Mock `/me` roles such as `campus_admin`
- Organizer-specific API functions, query hooks, types, fixtures, and navigation targets

The student profile may retain neutral student labels such as campus, course, year, skills, and interests. It must not display organizer/admin access.

### 5.2 Preserve attendee events and remove event management

Preserve and complete these mobile capabilities:

- Events entry/category on Discover
- Event routes under `prototype/app/discover/events/`
- Event list, search, filters, details, schedules, venue/map links, organizer display information, save/bookmark, registration/RSVP, share/deep links, and reminders
- Published-event client models, fixtures, API handlers, search results, saved-content entries, notification types, and navigation prefixes
- Event reminder settings and reminder deep links

Remove or revise these organizer-only capabilities:

- Event quick actions that create or manage an event
- Event create/edit/publish/cancel forms
- Attendee administration, approvals, check-in, organizer messaging, analytics, and dashboards
- Event teams and any `ApiEventTeam`-style types
- Organizer-only event mutations from the mobile API client
- Any event-specific post field that grants management behavior; simple links from a post to a published event may remain

Published organizer name, organization name, logo, and contact/link information may appear on an event detail page. Displaying this public event metadata does not grant organizer access.

General programming concepts named “event,” such as a UI press event or WebSocket message event, are not product-event features and do not need to be renamed.

### 5.3 Preserve and decouple Team Finder

Keep the existing Team Finder flows:

- `/discover/tribe`
- `/discover/tribe/new-team`
- `/discover/tribe/team/[id]`
- Team requests and applications
- Team membership and team chat

Team Finder must use its own backend entities and cannot depend on event IDs, event roles, or organizer permissions.

### 5.4 Cleanup acceptance criteria

- A student can discover, search/filter, open, save, register for, share, and receive reminders for published events.
- A student cannot navigate to an organizer dashboard or event create/manage screen through tabs, buttons, deep links, search, notifications, or saved content.
- No mobile request performs an organizer-only event mutation.
- Published-event and attendee-interaction types remain; organizer-role, event-management, event-team, and dashboard types are removed from the active mobile domain.
- Direct requests made with a mobile student token to organizer endpoints return an authorization error.
- Team Finder create, browse, detail, apply, membership, and chat flows still work with mock data.
- Event discovery, details, save/RSVP, and reminder flows still work with mock data.
- Type checking, linting, unit tests, and mobile smoke tests pass.
- Existing mock-only prototype behavior remains usable until each screen is migrated to the real API.

## 6. Proposed Technical Architecture

This section is a recommendation, not a final decision.

### 6.1 Recommended stack

| Concern | Recommendation | Reason |
|---|---|---|
| API | TypeScript with NestJS | Strong module boundaries, validation, testing, OpenAPI support, and alignment with the TypeScript mobile client |
| Architecture | Modular monolith | Faster MVP delivery with clear boundaries and fewer operational dependencies than microservices |
| Database | PostgreSQL | Reliable relational model, transactions, full-text search, indexing, and mature tooling |
| Managed platform | Supabase-managed PostgreSQL is a candidate | Existing realtime protocol is Supabase/Phoenix-shaped and it can reduce initial operations work |
| Authentication | Supabase Auth is recommended for MVP | Secure OTP/session lifecycle without building identity infrastructure from scratch |
| Realtime | Supabase Realtime or a NestJS WebSocket gateway | Must be selected after reviewing hosting, authorization, and operational needs |
| Cache/jobs | Redis only when required | Useful for rate limiting, background jobs, and presence; not mandatory for the first vertical slice |
| File storage | S3-compatible object storage or Supabase Storage | Direct signed uploads and controlled access to profile/post media |
| API contract | REST `/v1` plus generated OpenAPI | Simple mobile integration, typed client generation, and contract tests |
| Observability | Structured logs, error tracking, metrics, and traces | Required to diagnose auth, API, database, and realtime failures |

### 6.2 Architecture shape

```text
Mobile App
   |
   | HTTPS REST + authenticated realtime connection
   v
API / Modular Monolith
   |-- Auth and Sessions
   |-- Users and Profiles
   |-- Events (student-facing read/participation API)
   |-- Posts and Feed
   |-- Team Finder
   |-- Connections
   |-- Chat
   |-- Notifications
   |-- Search
   |-- Moderation
   `-- Health and Operations
   |
   +--> PostgreSQL
   +--> Object Storage
   +--> Push Provider (Expo/FCM/APNs)
   `--> Optional Redis / Job Worker
```

### 6.3 Suggested repository structure

```text
campus/
  prototype/                  # Existing React Native/Expo mobile app
  backend/                    # Proposed NestJS API
    src/
      modules/
        auth/
        campuses/
        users/
        profiles/
        events/
        posts/
        feed/
        team-finder/
        connections/
        chat/
        notifications/
        search/
        moderation/
        media/
        health/
      common/
        auth/
        database/
        errors/
        pagination/
        logging/
        validation/
      config/
      main.ts
    migrations/
    test/
    openapi/
  packages/
    api-contract/             # Optional generated/shared API types
  docs/
```

The backend folder name can be changed to `apps/api/` if the project adopts a monorepo tool. The MVP does not require a monorepo migration.

## 7. Backend Module Responsibilities

### Auth and Sessions

- OTP request and verification integration
- Access/refresh session lifecycle
- Device/session listing and revocation
- Account status checks
- Campus email/domain verification policy

### Users and Profiles

- Core user identity and account status
- Profile editing and public profile retrieval
- Skills, interests, links, education details, avatar, and privacy controls
- Profile completion and discoverability

### Posts and Feed

- Post creation, editing, soft deletion, and media metadata
- Feed retrieval and cursor pagination
- Comments, reactions, bookmarks, ownership, and visibility

### Events

- Published-event discovery, filters, details, and public organizer metadata
- Student saves/bookmarks and registrations/RSVPs
- Reminder scheduling and notification integration
- Strict rejection of event authoring or management attempts from mobile student identities
- Import/read integration with the future organizer web portal's published-event source

### Team Finder

- Team request lifecycle
- Search and deterministic matching
- Applications and owner decisions
- Membership, roles within a team, and linked team chat

### Connections

- Suggested student discovery
- Pending, accepted, declined, and removed connection states
- Symmetric accepted-connection queries

### Chat

- Direct and team rooms
- Membership authorization
- Message persistence, pagination, realtime delivery, deduplication, and read state

### Notifications

- In-app notification inbox
- Notification preferences
- Registered mobile devices and push tokens
- Asynchronous delivery and retry tracking

### Search

- Search profiles, published events, posts, and team requests
- Campus and privacy filtering
- Ranking, typo tolerance, and pagination

### Moderation

- Blocks and reports
- Content/account moderation states
- Moderator audit records and reason codes
- Enforcement in feeds, events, search, profiles, Team Finder, and chat

## 8. Proposed Data Model

All primary keys should be UUIDs. Store timestamps in UTC. User-generated records should normally include `created_at`, `updated_at`, and nullable `deleted_at`. Foreign keys, unique constraints, and check constraints must enforce important rules in addition to application validation.

### 8.1 Identity and campus

#### `users`

- `id`
- `auth_provider_id` (unique)
- `email` (normalized, unique)
- `campus_id`
- `status`: `pending`, `active`, `suspended`, `deleted`
- `email_verified_at`
- `onboarding_completed_at`
- timestamps

#### `campuses`

- `id`
- `name`
- `slug` (unique)
- `country_code`
- `timezone`
- `status`

#### `campus_email_domains`

- `id`
- `campus_id`
- `domain` (unique)
- `verification_required`

If authentication is not delegated to Supabase Auth, add passwordless challenges, refresh-token families, device sessions, token rotation, and replay detection. Building these securely will add substantial scope.

### 8.2 Profiles

#### `profiles`

- `user_id` (primary key and foreign key)
- `display_name`
- `username` (normalized, unique)
- `bio`
- `avatar_key`
- `course`
- `graduation_year`
- `location_text`
- `profile_visibility`: `campus`, `connections`, `private`
- `discoverable`
- timestamps

#### `skills`, `interests`

- `id`
- normalized unique `name`
- optional category

#### `profile_skills`, `profile_interests`

- `user_id`
- `skill_id` or `interest_id`
- optional proficiency for skills
- composite unique constraint

#### `profile_links`

- `id`
- `user_id`
- `type`
- `url`
- display order

### 8.3 Posts and engagement

#### `posts`

- `id`
- `author_id`
- `campus_id`
- `body`
- `visibility`: initially `campus` or `connections`
- `status`: `published`, `hidden`, `removed`
- optional edited timestamp
- timestamps and soft deletion

#### `post_media`

- `id`
- `post_id`
- storage key, MIME type, size, width, height
- display order
- scan/moderation status

#### `comments`

- `id`
- `post_id`
- `author_id`
- optional `parent_comment_id` if one-level replies are approved
- `body`
- moderation status
- timestamps and soft deletion

#### `post_reactions`

- `post_id`
- `user_id`
- `reaction_type`
- unique `(post_id, user_id)` for one active reaction per user

#### `post_bookmarks`

- `post_id`
- `user_id`
- `created_at`
- unique `(post_id, user_id)`

Indexes should support campus feed ordering, author history, comment ordering, and user bookmarks. Counters may initially be calculated or transactionally maintained; avoid unreliable client-owned counts.

### 8.4 Events

#### `event_organizers`

- `id`
- `campus_id`
- public organization/display name
- logo/media key
- public contact or website fields
- `status`

This is public organizer metadata for event display. It does not make the mobile student a member of an organizer role.

#### `events`

- `id`
- `organizer_id`
- `campus_id`
- `title`
- `summary` and `description`
- category/tags
- venue name, address, and optional map coordinates/link
- `starts_at`, `ends_at`, and timezone
- optional capacity and registration deadline
- cover media key
- external/public link
- `status`: `draft`, `published`, `cancelled`, `completed`
- `published_at`
- timestamps

Only `published` events are returned by ordinary discovery. Cancelled registered/saved events may remain visible to affected students so the app can communicate the cancellation.

#### `event_registrations`

- `event_id`
- `user_id`
- `status`: `registered`, `waitlisted`, `cancelled`
- source and timestamps
- unique `(event_id, user_id)`

#### `event_bookmarks`

- `event_id`
- `user_id`
- `created_at`
- unique `(event_id, user_id)`

#### `event_reminders`

- `event_id`
- `user_id`
- reminder offset or `scheduled_for`
- delivery channels
- delivery status and timestamps
- unique active reminder rule per event/user

Event publishing and organizer management mutations are intentionally not part of the mobile student API contract. During the MVP, published events can be supplied through reviewed seed/import tooling or an agreed web-portal integration.

### 8.5 Team Finder

#### `team_requests`

- `id`
- `owner_id`
- `campus_id`
- `title`
- `description`
- `goal_type`
- `desired_member_count`
- `status`: `open`, `filled`, `closed`, `cancelled`
- optional commitment level and target date
- timestamps and soft deletion

#### `team_request_skills`, `team_request_interests`

- request ID plus skill/interest ID
- required/preferred flag for skills
- composite unique constraints

#### `team_applications`

- `id`
- `team_request_id`
- `applicant_id`
- `message`
- `status`: `pending`, `accepted`, `rejected`, `withdrawn`
- decision timestamp and actor
- unique active application per request/applicant

#### `team_members`

- `team_request_id`
- `user_id`
- `role`: `owner`, `member`
- `joined_at`
- `left_at`

Acceptance of an application, creation of membership, and creation/addition to the team chat must be transactional or safely retryable.

### 8.6 Connections

#### `connections`

- `id`
- `requester_id`
- `addressee_id`
- `status`: `pending`, `accepted`, `declined`, `removed`
- `responded_at`
- timestamps

Enforce no self-connection and only one active relationship for a normalized pair of users.

### 8.7 Chat

#### `chat_rooms`

- `id`
- `type`: `direct`, `team`
- optional `team_request_id` (unique for team rooms)
- `created_by`
- timestamps

#### `chat_members`

- `room_id`
- `user_id`
- `joined_at`
- optional `left_at`
- `last_read_message_id` or `last_read_at`
- notification preference

#### `chat_messages`

- `id`
- `room_id`
- `sender_id`
- `client_message_id`
- `body`
- optional reply target
- `status`: `visible`, `removed`
- timestamps and soft deletion
- unique `(sender_id, client_message_id)` for idempotent optimistic sends

Message ordering must use a stable cursor such as `(created_at, id)`. Room membership must be checked for every history request, send, read update, and realtime subscription.

### 8.8 Notifications and devices

#### `notifications`

- `id`
- `user_id`
- `type`
- actor and subject references where applicable
- safe JSON payload for display/deep link data
- `read_at`
- `created_at`

#### `notification_preferences`

- `user_id`
- in-app and push switches by supported category
- quiet-hours settings if approved

#### `user_devices`

- `id`
- `user_id`
- platform
- push token (unique)
- last seen and disabled timestamps

### 8.9 Safety and audit

#### `user_blocks`

- `blocker_id`
- `blocked_id`
- `created_at`
- unique pair and no self-block

#### `reports`

- `id`
- `reporter_id`
- target type and target ID
- reason code and optional details
- `status`: `open`, `reviewing`, `resolved`, `dismissed`
- resolution metadata
- timestamps

#### `moderation_actions`, `audit_logs`

- actor, action, target, reason, immutable metadata, and timestamp
- no secrets or message bodies copied into general logs

## 9. API Contract Conventions

- Base path: `/v1`
- JSON request and response bodies
- Bearer access tokens over HTTPS
- ISO 8601 UTC timestamps
- UUID identifiers represented as strings
- Cursor pagination for feeds, messages, notifications, comments, and search
- `Idempotency-Key` for retry-sensitive create/decision operations
- Server-generated OpenAPI document and generated mobile types where practical

### 9.1 Success envelope

Single resource:

```json
{ "data": { "id": "..." } }
```

Paginated collection:

```json
{
  "data": [],
  "page": {
    "nextCursor": "opaque-or-null",
    "hasMore": false
  }
}
```

### 9.2 Error envelope

```json
{
  "error": {
    "code": "TEAM_APPLICATION_ALREADY_EXISTS",
    "message": "An active application already exists.",
    "fields": {},
    "requestId": "..."
  }
}
```

The app may display `message` when it is explicitly user-safe. Internal exceptions, SQL errors, tokens, and sensitive data must never be returned.

## 10. Proposed REST Endpoints

Exact payloads will be finalized in OpenAPI before each mobile screen is migrated.

### 10.1 Auth and account

- `POST /v1/auth/otp/request`
- `POST /v1/auth/otp/verify`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `POST /v1/auth/logout-all`
- `GET /v1/me`
- `DELETE /v1/me` (confirmed account deletion workflow)
- `GET /v1/me/sessions`
- `DELETE /v1/me/sessions/:sessionId`

If Supabase Auth is selected, OTP/refresh may be called through its SDK while `/v1/me` remains the backend source of application profile and authorization state.

### 10.2 Profiles and discovery

- `GET /v1/profiles/:userId`
- `PATCH /v1/me/profile`
- `PUT /v1/me/skills`
- `PUT /v1/me/interests`
- `PUT /v1/me/links`
- `PATCH /v1/me/privacy`
- `GET /v1/students/suggestions`

### 10.3 Posts and feed

- `GET /v1/feed`
- `POST /v1/posts`
- `GET /v1/posts/:postId`
- `PATCH /v1/posts/:postId`
- `DELETE /v1/posts/:postId`
- `GET /v1/posts/:postId/comments`
- `POST /v1/posts/:postId/comments`
- `PATCH /v1/comments/:commentId`
- `DELETE /v1/comments/:commentId`
- `PUT /v1/posts/:postId/reaction`
- `DELETE /v1/posts/:postId/reaction`
- `PUT /v1/posts/:postId/bookmark`
- `DELETE /v1/posts/:postId/bookmark`
- `GET /v1/me/bookmarks`
- `GET /v1/me/posts`

### 10.4 Events: attendee-facing only

- `GET /v1/events`
- `GET /v1/events/:eventId`
- `PUT /v1/events/:eventId/bookmark`
- `DELETE /v1/events/:eventId/bookmark`
- `GET /v1/me/event-bookmarks`
- `POST /v1/events/:eventId/registrations`
- `DELETE /v1/events/:eventId/registrations/me`
- `GET /v1/me/event-registrations`
- `PUT /v1/events/:eventId/reminder`
- `DELETE /v1/events/:eventId/reminder`

The mobile contract intentionally has no student-authorized `POST /events`, `PATCH /events/:id`, publish, cancel, attendee-management, analytics, or dashboard endpoint. Future organizer routes must use separate web authentication/authorization and an explicit protected namespace or service boundary.

### 10.5 Team Finder

- `GET /v1/team-requests`
- `POST /v1/team-requests`
- `GET /v1/team-requests/:requestId`
- `PATCH /v1/team-requests/:requestId`
- `DELETE /v1/team-requests/:requestId`
- `POST /v1/team-requests/:requestId/applications`
- `GET /v1/team-requests/:requestId/applications` (owner only)
- `POST /v1/team-applications/:applicationId/accept`
- `POST /v1/team-applications/:applicationId/reject`
- `POST /v1/team-applications/:applicationId/withdraw`
- `GET /v1/me/team-requests`
- `GET /v1/me/team-applications`
- `GET /v1/team-requests/:requestId/members`
- `DELETE /v1/team-requests/:requestId/members/:userId`
- `POST /v1/team-requests/:requestId/leave`

### 10.6 Connections

- `GET /v1/connections`
- `GET /v1/connections/requests`
- `POST /v1/connections/requests`
- `POST /v1/connections/:connectionId/accept`
- `POST /v1/connections/:connectionId/decline`
- `DELETE /v1/connections/:connectionId`

### 10.7 Chat

- `GET /v1/chat/rooms`
- `POST /v1/chat/rooms/direct`
- `GET /v1/chat/rooms/:roomId`
- `GET /v1/chat/rooms/:roomId/messages`
- `POST /v1/chat/rooms/:roomId/messages`
- `DELETE /v1/chat/messages/:messageId`
- `POST /v1/chat/rooms/:roomId/read`
- authenticated realtime channel for message-created, message-removed, read-state, and optional typing events

### 10.8 Notifications

- `GET /v1/notifications`
- `POST /v1/notifications/:notificationId/read`
- `POST /v1/notifications/read-all`
- `GET /v1/me/notification-preferences`
- `PATCH /v1/me/notification-preferences`
- `POST /v1/me/devices`
- `DELETE /v1/me/devices/:deviceId`

### 10.9 Search, media, and safety

- `GET /v1/search?q=...&type=profiles|events|posts|teams`
- `POST /v1/media/upload-intents`
- `POST /v1/media/:mediaId/complete`
- `POST /v1/blocks`
- `GET /v1/blocks`
- `DELETE /v1/blocks/:userId`
- `POST /v1/reports`
- `GET /v1/health/live`
- `GET /v1/health/ready`

## 11. Authorization and Data Isolation

The API must use deny-by-default authorization. Authentication alone is not sufficient; each operation must verify ownership, membership, relationship, campus, visibility, block state, and account status as applicable.

| Resource/action | Required rule |
|---|---|
| View campus feed | Active, onboarded user; same campus; visibility and block filters apply |
| Discover/view event | Active, onboarded user; event is published and visible to the user's campus/audience |
| Save/register/set reminder | Active student; published event; capacity/deadline and duplicate rules apply |
| Create/edit/manage event | Denied to mobile student identities; web organizer authorization required |
| Edit/delete post or comment | Resource owner; moderation may hide/remove through separate protected tooling |
| View profile | Profile visibility, campus relationship, discoverability, and blocks apply |
| Apply to team | Active user; same campus; open request; not owner/member/blocked |
| Review applications | Team request owner only |
| Manage member | Team owner; owner cannot remove self without ownership/closure handling |
| View/send chat | Active room member only |
| Direct chat creation | Accepted connection by default, unless product approves a request inbox |
| View notification | Notification recipient only |
| Report content | Active user; target exists; duplicate/rate-limit policy applies |

All normal student queries must be campus-scoped unless the product explicitly introduces cross-campus discovery later. Authorization tests must prove that changing an ID cannot expose another campus or another user's private data.

## 12. Core Feature Behavior

### 12.1 Feed

Initial ranking should be deterministic and understandable:

1. Filter to permitted campus/connection content.
2. Remove blocked, deleted, hidden, and moderated content.
3. Order primarily by recency.
4. Optionally apply a small engagement signal without making it the only ranking factor.
5. Use opaque cursor pagination with stable tie-breaking by ID.

Chronological behavior is acceptable for the first release. Complex recommendation models are not required.

### 12.2 Event discovery and reminders

- Return published, audience-eligible events ordered by start date with filters for date, category, campus, location, and saved/registered state.
- Event detail responses include attendee-safe public data only. Internal organizer notes, attendee lists, analytics, and management controls are never returned.
- Registration must enforce deadline, capacity/waitlist, cancellation, and idempotency rules transactionally.
- Saving an event and registering for an event are separate states.
- A student can choose a reminder; the server schedules it using the event timezone and the student's preference.
- If an event time changes or is cancelled, affected saved/registered students receive an update and existing reminders are recalculated or cancelled.

### 12.3 Team Finder matching

The first version should use deterministic scoring:

- Required skill eligibility
- Preferred skill overlap
- Interest overlap
- Same campus
- Availability/commitment compatibility if collected
- Exclusion of closed teams, existing applicants/members, blocked users, and hidden profiles

The API can return a match explanation such as “3 matching skills.” No machine learning or sensitive inferred attributes are needed.

### 12.4 Realtime chat

1. Mobile obtains a valid access token.
2. REST loads authorized rooms and paginated message history.
3. Mobile subscribes to authorized room changes.
4. A send includes a client-generated `clientMessageId`.
5. The server verifies membership, validates content, and persists once.
6. The persisted message is published to current room members.
7. The sender reconciles the optimistic message by `clientMessageId`.
8. Reconnect fetches messages after the latest stable cursor to fill gaps.

Presence and typing indicators should be ephemeral and may be deferred. Persisted messages, membership checks, deduplication, reconnect recovery, and pagination are required.

### 12.5 Blocking behavior

Blocking must consistently:

- Hide both users from each other's discovery/search results and user-generated content views.
- Prevent new connections, Team Finder applications, direct rooms, and direct messages.
- Define behavior for shared team rooms. Recommended MVP behavior is to keep necessary shared-room system access but suppress direct interaction where possible; this needs product approval.
- Revoke pending connection requests between the pair.
- Avoid notifying the blocked user that a block occurred.

### 12.6 Deletion behavior

- Normal content deletion is soft deletion so references and moderation evidence remain coherent.
- Deleted content is not returned to ordinary clients.
- Account deletion should revoke sessions immediately, disable the profile, hide content, schedule media cleanup, and follow the approved retention policy.
- Audit/security records may need separate retention from public content.

## 13. Media Uploads

If images are included in MVP:

1. Mobile requests a signed upload intent.
2. Backend validates file type, size, count, and intended use.
3. Mobile uploads directly to object storage.
4. Mobile marks the upload complete.
5. Backend verifies the object and records metadata.
6. Malware/content checks run before or shortly after publication according to risk policy.

The database stores storage keys, never permanent public upload credentials. URLs should be generated or served through controlled public/CDN rules.

To reduce first-release scope, the product can approve text-only posts and avatars, then add post images in a later milestone.

## 14. Notifications

Initial notification types should be limited to useful mobile actions:

- Connection request and accepted connection
- Post reaction and comment
- Team application received, accepted, rejected, or withdrawn
- Team membership change
- Event registration confirmation, waitlist change, schedule/venue change, cancellation, and requested event reminder
- New direct/team message push summary
- Safety/account notices

Event reminders are a required mobile feature. They must be created only for students who explicitly save/register or enable a reminder, respect notification preferences, use the event timezone correctly, and be cancelled or rescheduled when the event changes. Notification creation should occur from committed domain actions, preferably through a transactional outbox so database success is not lost when push delivery fails.

Push delivery should be asynchronous with retries, invalid-token cleanup, preference enforcement, and no sensitive message body on the lock screen unless the user enables previews.

## 15. Search

Start with PostgreSQL full-text search and trigram indexes:

- Prefix/typo-tolerant username and display-name search
- Published event title, description, category, organizer display name, venue, and date filtering
- Weighted post body search
- Team title, description, skills, and interests search
- Campus, visibility, moderation, and block filters applied before returning results

Move to a dedicated search engine only after measured database/search latency or ranking needs justify it. Index updates must not leak deleted, hidden, private, cross-campus, or blocked content.

## 16. Security and Abuse Prevention

Minimum MVP controls:

- HTTPS everywhere and encrypted managed storage
- Secrets stored in platform secret management, never committed to the repository
- Short-lived access tokens and secure refresh/token rotation handled by the selected auth provider
- DTO/schema validation and rejection of unknown or oversized fields
- Parameterized database access through a reviewed ORM/query layer
- Rate limits for OTP requests, login attempts, search, posting, comments, applications, connection requests, chat sends, and reports
- Generic OTP responses to reduce account enumeration
- Authorization enforced on the server, not inferred from hidden mobile controls
- Media type/size validation and upload quotas
- Sensitive-data redaction in logs and error tracking
- Request IDs, security events, and immutable moderation/audit records
- Dependency, secret, static-analysis, and migration checks in CI
- Backup restoration tests and documented incident/rollback procedures

Before public launch, define report response ownership, moderation service levels, data retention, privacy policy, terms, and account deletion handling.

## 17. Mock-to-Real API Migration

The current mobile API layer calls a stateful in-memory backend and uses a mock base URL. Migration should be incremental.

### 17.1 Client boundary

- Introduce environment-based configuration for `mock`, `local`, `staging`, and `production`.
- Keep one typed API interface used by React Query hooks.
- Implement HTTP transport behind that interface.
- Keep mock transport only for local demos, fixtures, component tests, and offline UI development.
- Never allow production builds to silently fall back to mock data.

### 17.2 Contract parity

- Define OpenAPI request/response contracts.
- Adapt mock fixtures to those same contracts.
- Generate or validate TypeScript client types.
- Add tests proving mock and HTTP adapters return the same domain shape.
- Normalize API errors at the client boundary.

### 17.3 Screen-by-screen cutover order

1. Auth and `/me`
2. Onboarding/profile
3. Event discovery, details, bookmarks/registrations, and reminders
4. Feed and post details
5. Comments, reactions, and bookmarks
6. Team Finder
7. Connections/student discovery
8. Chat history and realtime delivery
9. Notifications
10. Search
11. Reports, blocks, settings, and account deletion

Each cutover should include loading, empty, error, retry, offline, expired-session, and authorization-denied behavior.

## 18. Testing Strategy

### Unit tests

- Domain rules, validation, scoring, permissions, and state transitions
- Event visibility, registration capacity/deadline, waitlist, cancellation, timezone, and reminder scheduling rules
- Feed cursor and chat cursor encoding/decoding
- Notification preference and block filtering

### Integration tests

- Run against a real PostgreSQL instance
- Test migrations, constraints, transactions, queries, and indexes
- Test auth-provider token verification
- Test event registration, cancellation, and reminder rescheduling transactions
- Test team acceptance and chat-room creation atomically

### Contract tests

- OpenAPI schema validation
- Mobile client/mock/real response parity
- Stable error codes and pagination behavior

### Authorization tests

- Resource ownership
- Published-event visibility and rejection of organizer mutations from mobile student tokens
- Room/team membership
- Same-campus isolation
- Private profile visibility
- Blocked-user behavior
- Suspended/deleted account behavior
- ID enumeration attempts

### Realtime tests

- Duplicate sends
- Reconnect and missed-message recovery
- Out-of-order delivery reconciliation
- Removed member access revocation
- Token expiration and refresh
- Concurrent read updates

### Mobile end-to-end smoke tests

- Sign in and onboarding
- Discover/filter/open/save/register for an event and receive/read its reminder
- Create/view/react/comment/save a post
- Create/apply/accept a team request
- Connect and exchange messages
- Receive/read a notification
- Search, block, and report

### Performance and security tests

- Event discovery, feed, search, and message-history load tests using realistic pagination
- OTP, chat, and content-creation rate-limit tests
- Dependency/secret/static scans
- Restore-from-backup rehearsal before production launch

## 19. Environments, Deployment, and Operations

### Environments

- **Local:** local API/database or approved hosted developer project; seeded fixtures
- **Development:** shared integration environment; disposable test users
- **Staging:** production-like configuration and migrations; no production personal data
- **Production:** isolated database, storage, secrets, auth configuration, and monitoring

Each environment must use distinct credentials, auth projects, push settings, storage buckets, and database connections.

### CI/CD gates

- Install with locked dependencies
- Formatting, linting, and type checking
- Unit and integration tests
- OpenAPI compatibility check
- Migration validation against a clean database and previous schema snapshot
- Security and secret checks
- Build API and mobile client
- Deploy to staging before production promotion

### Database migrations

- Versioned and committed migrations
- Forward-compatible expand/migrate/contract strategy for risky schema changes
- Backward compatibility during mobile rollout because older app versions may remain installed
- Automated backups, point-in-time recovery where available, and regular restore tests

### Observability

- Structured JSON logs with request/user correlation IDs and redaction
- Error tracking for backend and mobile
- Metrics for latency, errors, database saturation, auth failures, realtime connections, push failures, and job backlog
- Alerts based on user impact rather than raw log volume
- Health endpoints that separately represent process liveness and dependency readiness

## 20. Implementation Phases and Exit Criteria

### Phase 0: Decisions and contract baseline

Work:

- Approve Section 22 decisions.
- Confirm final mobile MVP navigation.
- Confirm stack and hosting.
- Write initial OpenAPI conventions and domain glossary.

Exit criteria:

- Scope, architecture, auth, realtime, media, and deployment choices are recorded.
- No unresolved decision blocks the first vertical slice.

### Phase 1: Mobile organizer-boundary cleanup

Work:

- Remove organizer access and event management functionality described in Section 5 while preserving attendee event access.
- Decouple Team Finder.
- Update mock data, event participant flows, and navigation tests.

Exit criteria:

- All Section 5.4 acceptance criteria pass.
- The student prototype remains fully demonstrable with mock event discovery and reminders.

### Phase 2: Backend foundation

Work:

- Scaffold API, configuration, database layer, migrations, logging, error handling, validation, OpenAPI, health checks, and CI.
- Establish local seed/test data and environment separation.

Exit criteria:

- API deploys to development.
- Clean database migration and rollback/restore procedure are tested.
- Health, logging, and test pipelines pass.

### Phase 3: Auth, onboarding, and profiles

Work:

- Integrate selected auth provider.
- Implement user/campus/profile data and privacy.
- Connect the mobile auth, onboarding, and profile screens.

Exit criteria:

- A new student can verify, onboard, sign back in, edit a profile, revoke a session, and sign out.
- Campus and profile visibility tests pass.

### Phase 4: Student event access

Work:

- Implement published-event discovery, filters, details, bookmarks, registration/RSVP, and reminders.
- Establish the approved published-event seed/import or web-portal data source.
- Migrate the mobile event discovery, detail, saved/registered, and reminder screens.

Exit criteria:

- A student can complete the full attendee event journey using real backend data.
- Event cancellation/time-change behavior and reminder rescheduling pass.
- Mobile student credentials cannot call any event creation, management, attendee-admin, analytics, or organizer-dashboard operation.

### Phase 5: Posts and feed

Work:

- Implement posts, feed, comments, reactions, bookmarks, and optional media.
- Migrate corresponding mobile screens.

Exit criteria:

- Full post lifecycle works across two real accounts.
- Pagination, authorization, blocking, and moderation filters pass.

### Phase 6: Team Finder

Work:

- Implement requests, matching, applications, decisions, membership, and team-room creation.
- Migrate Team Finder screens.

Exit criteria:

- Owner and applicant complete the full team lifecycle.
- Duplicate/concurrent application decisions cannot corrupt membership.
- Team Finder has no event or organizer dependency.

### Phase 7: Connections and chat

Work:

- Implement connection state machine.
- Implement direct/team rooms, history, sends, reads, and realtime subscriptions.

Exit criteria:

- Two connected users exchange messages with optimistic UI, reconnect recovery, and deduplication.
- Unauthorized room access fails in REST and realtime paths.

### Phase 8: Notifications, search, and safety

Work:

- Add notification outbox/delivery, preferences, and devices.
- Add PostgreSQL search across students, events, posts, and Team Finder.
- Complete blocks, reports, and moderation enforcement.

Exit criteria:

- Supported domain actions reliably create in-app notifications.
- Requested event reminders and event change/cancellation notifications are delivered correctly.
- Push retry and invalid-token handling work.
- Search and all major read paths respect visibility, campus, blocks, deletion, and moderation state.

### Phase 9: Production hardening and release

Work:

- Complete end-to-end, load, security, backup, and rollback validation.
- Review analytics, privacy, retention, incident response, and store build configuration.
- Disable production mock fallback.

Exit criteria:

- MVP acceptance criteria in Section 21 pass in staging.
- Production monitoring, alerts, backups, moderation ownership, and rollback are ready.
- Release approval is recorded.

## 21. MVP Definition of Done

The backend MVP is complete only when:

- Student event discovery, details, save/register, share, and reminders work in the mobile app.
- No organizer access, event creation/management control, or organizer dashboard is available to a mobile student.
- The app works with real backend data for every included feature.
- Mock mode remains available only where intentionally configured for development/tests.
- Authentication survives app restart and supports safe logout/session revocation.
- At least two test students can complete the event attendee, post, Team Finder, connection, and chat journeys end to end.
- Feed, messages, notifications, comments, and search paginate without duplicates or missing records under normal use.
- Cross-user, cross-campus, blocked-user, deleted-content, and chat-membership authorization tests pass.
- Realtime chat recovers after reconnect and does not duplicate optimistic messages.
- Event reminders respect timezone and preference settings and react safely to schedule changes or cancellations.
- Rate limiting, validation, safe errors, audit logging, and secret management are active.
- Staging smoke, integration, migration, security, and performance checks pass.
- Production has monitoring, alerts, backups, restore instructions, and a rollback procedure.
- API contracts and operational setup are documented sufficiently for another developer to run and maintain the system.

## 22. Decisions Required Before Implementation

Please approve or change each item.

| # | Decision | Recommended starting choice | Alternatives / impact |
|---|---|---|---|
| 1 | Backend framework | NestJS + TypeScript modular monolith | Express/Fastify is lighter but requires more project conventions; another language increases frontend/backend context switching |
| 2 | Database | PostgreSQL | Best fit for relationships, transactions, search, and reliable constraints |
| 3 | Managed platform | Supabase-managed PostgreSQL | Another managed PostgreSQL provider is valid if hosting/cost requirements favor it |
| 4 | Authentication | Supabase Auth with email OTP | Custom auth adds security and session-management scope; another managed provider is possible |
| 5 | Campus verification | Require an approved campus email domain where available | Manual approval or open signup changes abuse risk and onboarding friction |
| 6 | Realtime chat | Supabase Realtime initially | NestJS WebSocket gateway offers more control but adds connection scaling/operations work |
| 7 | Chat eligibility | Direct chat only after an accepted connection | Message requests increase moderation and inbox scope |
| 8 | Post media | Start with text plus image attachments if storage/moderation budget permits | Text-only shortens the first release |
| 9 | Feed visibility | Campus and connections | Adding public/global visibility requires cross-campus policy and moderation decisions |
| 10 | Team scope | Same-campus teams only | Cross-campus teams require revised discovery and safety rules |
| 11 | Other prototype areas | Hide Notes, Clubs, Marketplace, Opportunities, and Assistant for initial MVP | Keeping placeholders may confuse users; implementing them expands backend scope |
| 12 | Hosting | Select after budget and provider constraints are known | Needed before CI/CD and environment design is finalized |
| 13 | Moderation operations | Define who reviews reports and expected response times | Required before real-user launch |
| 14 | Blocking in shared team chat | Preserve shared-room access but suppress direct interaction | Removing a blocker/blocked member automatically may disrupt teams and requires explicit rules |
| 15 | Comment replies | Flat comments for MVP | One-level replies add manageable scope; unlimited nesting is not recommended |
| 16 | Published event source before the web portal is ready | Reviewed seed/import tooling writing the same event schema | Waiting for the organizer portal blocks mobile event integration; a temporary unrelated mock-only schema creates migration work |

## 23. Work That Must Wait for Approval

Until this plan is reviewed, do not:

- Delete organizer code or any student-facing event discovery/reminder code.
- Change the prototype navigation.
- Scaffold or select a backend framework/provider.
- Change authentication behavior.
- Remove other prototype features not explicitly covered by the organizer/mobile-event boundary.
- Create production infrastructure or external services.

After approval, Phase 1 should be implemented first so the prototype remains fully functional with mock data before backend migration begins.
