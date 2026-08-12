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
| Posts | Read visible feed, create/update/delete own post, comments, like, bookmark, private image/PDF media, first-link preview metadata, event/team cards, poll creation and voting |
| Study resources | Browse same-campus approved notes, upload approved document types, signed download, own edit/delete, bookmark, and report |
| Team Finder | Create/update/close own request, discover open requests, apply, withdraw/reapply, invite, accept/reject, membership, team chat |
| Connections | Request, accept/decline/cancel/remove, follow/unfollow, block/unblock |
| Chat | Accepted direct/team rooms, member messages, read state, reactions, edit/delete limits, private 20 MB attachments, signed downloads |
| Notifications | Read own notifications, mark read, preferences, device registration |
| Search | Privacy-aware profile/event/post/team search through `search_mobile` |
| Safety | Own reports, own blocks; moderator action RPC requires protected role |
| Analytics | Consent-gated event RPC; body/message/token fields stripped server-side |

## Protected operations

Service role only: event import/authoring, notification/reminder processors, outbox claim/complete, team expiry, retention/deletion workers, and staff-role assignment. Moderator/support RPCs require protected staff roles; normal students cannot read moderation queues or audit history. Organizer permissions are never reused for moderation.

## Transactional mobile RPCs

Migration `0013_mobile_transactional_mutations.sql` is authoritative for profile onboarding/edit, post/media/poll writes, Team Finder creation/application withdrawal, follows, device registration, notification reads, event reminders, chat mute, reports, and blocks. Mobile storage paths are user-scoped and RLS-protected: `post-media/<user_id>/...` and `chat-attachments/<conversation_id>/<user_id>/...`.
