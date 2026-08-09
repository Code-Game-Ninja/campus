# CampusSphere Mobile API Contract

## Boundary

Mobile requests use Supabase Auth access tokens and PostgREST/RPC. Student tokens may read or mutate student-owned resources only. No mobile endpoint creates, edits, publishes, cancels, administers, or analyzes events. Organizer authoring remains web-only/service-role import.

## Request rules

- Base REST path: `/rest/v1`.
- RPC path: `/rest/v1/rpc/<function>`.
- Auth: `Authorization: Bearer <Supabase access token>` plus public `apikey`.
- Writes requiring retry use client-owned idempotency IDs where schema supports them.
- List endpoints use stable `created_at`/`id` ordering and bounded `limit`.
- Error body is Supabase/PostgREST JSON; clients must use `status`, `code`, `message`, and `details` without exposing SQL text.

## Student resources

| Resource | Student operations |
|---|---|
| Auth/profile | OTP, session refresh/logout, campus bootstrap, own profile update, own export/deletion request/cancel |
| Events | Read published same-campus events, organizer display metadata, bookmark, register/cancel, reminder |
| Posts | Read visible feed, create/update/delete own post, comments, like, bookmark, approved media |
| Team Finder | Create/update/close own request, discover open requests, apply, invite, accept/reject, membership, team chat |
| Connections | Request, accept/decline/cancel/remove, follow/unfollow, block/unblock |
| Chat | Accepted direct/team rooms, member messages, read state, reactions, edit/delete limits, attachments |
| Notifications | Read own notifications, mark read, preferences, device registration |
| Search | Privacy-aware profile/event/post/team search through `search_mobile` |
| Safety | Own reports, own blocks; moderator action RPC requires protected role |
| Analytics | Consent-gated event RPC; body/message/token fields stripped server-side |

## Protected operations

Service role only: event import/authoring, notification/reminder processors, outbox claim/complete, team expiry, retention/deletion workers, and staff-role assignment. Moderator/support RPCs require protected staff roles; normal students cannot read moderation queues or audit history. Organizer permissions are never reused for moderation.
