# CampusSphere MVP Implementation Tasks

**Status:** Draft — awaiting approval before implementation  
**Source:** `docs/mvp_implementation_questionnaire.md`, `docs/backend_mvp_implementation_plan.md`, `docs/architecture_decisions.md`  
**Target:** Closed-pilot MVP by 15 August 2026  
**Implementer:** Codex with owner review  
**Task size:** 1–4 hours  
**Approval model:** Stop after every phase  
**External resources:** Ask before creating/configuring any service

## 1. Approved Product Boundary

- Mobile is student-facing.
- Students can discover, view, save/register for, share, and receive reminders for published campus events.
- Students cannot create, edit, publish, cancel, administer, analyze, or manage events.
- Students cannot access organizer/professional dashboards or organizer roles.
- Organizer authoring and management remain web-only.
- Team Finder is student-owned and independent of event teams.
- Non-MVP areas remain visible as disabled “Coming soon” screens.
- First pilot target is approximately 100 users, with a scalable design toward 10,000.
- Android is the immediate prototype target; iOS 17+ and Android 14+ are test targets where available.
- Zero paid infrastructure budget is assumed.

## 2. Working Interpretations of Conflicting Answers

These defaults make the plan executable. They must be confirmed or changed during Phase 0:

| Area | Working default |
|---|---|
| Backend | Supabase-first: Auth, PostgreSQL, SQL migrations/RLS, Realtime, Storage, Edge Functions. NestJS is deferred. |
| Events | Browse/search/filter/details, save, internal registration, cancellation, waitlist, reminders, share, calendar/maps links, and updates. |
| Notifications | In-app and email required; Expo push is optional until explicitly approved because the questionnaire did not select push in Q9.1. |
| Posts | Like-only reactions and flat comments unless one option is selected. |
| Team joining | Apply-and-owner-approve; one application format and one chat-creation point must be selected. |
| Chat | Direct accepted-connection chat and team chat; event chat/general student-created groups deferred. |
| Offline | Read previously loaded data; queued writes deferred until an explicit conflict/idempotency design is approved. |
| Deletion | Immediate disable, 30-day grace period, then cleanup; safety/audit retention documented. |
| Notifications history | 90-day server default unless changed. |
| Analytics | Consent-gated, aggregate internal events; no mobile admin dashboard. |

## 3. Task Format and Status

Every task includes objective, dependencies, affected files/modules, acceptance criteria, tests, risk/rollback, estimate, and approval gate.

- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[!]` blocked

## Phase 0 — Decisions and Safety Baseline

### P0.1 Resolve conflicting questionnaire answers

- **Objective:** Record one executable choice for every conflict in Section 2.
- **Dependencies:** None.
- **Affected:** Questionnaire, this document, API contract.
- **Acceptance:** Event actions, reactions/comments, Team Finder join/application/chat flow, notification channels, retention, offline writes, and backend shape each have one decision.
- **Tests:** Documentation consistency review.
- **Risk/rollback:** Documentation-only; preserve original answers.
- **Estimate:** 1 hour.
- **Gate:** Owner approval.

### P0.2 Confirm free-tier services and secrets policy

- **Objective:** Confirm Supabase, Expo, email, hosting, and GitHub Actions resources without creating anything.
- **Dependencies:** P0.1.
- **Affected:** `docs/`, environment templates.
- **Acceptance:** Provider accounts, free-tier limits, owner access, and no-secret-in-repository policy documented.
- **Tests:** Missing-secret validation and secret scan.
- **Risk/rollback:** Stop before external writes without approval.
- **Estimate:** 1 hour.
- **Gate:** Owner approval.

### P0.3 Freeze initial REST/OpenAPI contract

- **Objective:** Define `/v1` resources, error envelope, cursor pagination, idempotency, and student/organizer authorization boundary.
- **Dependencies:** P0.1.
- **Affected:** `docs/api_contract.md`, optional `packages/api-contract/`.
- **Acceptance:** Auth, profiles, events, posts, Team Finder, connections, chat, notifications, search, moderation, settings, and analytics resources are defined; organizer write/dashboard APIs are excluded from mobile student access.
- **Tests:** OpenAPI lint/format check.
- **Risk/rollback:** Contract-only and amendable.
- **Estimate:** 2 hours.
- **Gate:** Technical/product approval.

## Phase 1 — Mobile Organizer Cleanup and Attendee Events

### P1.1 Inventory mobile boundary

- **Objective:** List every organizer/professional route, role check, event-management action, event-team type, and preserved attendee event flow.
- **Dependencies:** P0.3.
- **Affected:** `prototype/app/`, `prototype/src/`.
- **Acceptance:** Inventory is complete and Team Finder is marked independent.
- **Tests:** Static route/type inventory.
- **Risk/rollback:** Read-only.
- **Estimate:** 2 hours.
- **Gate:** None.

### P1.2 Remove organizer/professional access

- **Objective:** Remove organizer routes, access requests, role badges, professional settings, quick actions, and mock organizer roles.
- **Dependencies:** P1.1.
- **Affected:** `prototype/app/organizer/`, professional access screen, tabs/create/profile, account types/mock `/me`.
- **Acceptance:** No organizer route, dashboard, role, or mutation is reachable by a student; direct access returns safe forbidden/not-found behavior.
- **Tests:** Route smoke, negative authorization, TypeScript/lint.
- **Risk/rollback:** Isolated frontend change; preserve event attendee routes.
- **Estimate:** 3–4 hours.
- **Gate:** Phase 1 approval.

### P1.3 Preserve attendee event flows and remove management controls

- **Objective:** Keep event list/detail/save/register/reminder UI and remove create/edit/publish/cancel/manage/check-in/analytics controls.
- **Dependencies:** P1.1.
- **Affected:** event routes, Discover, create navigation, `prototype/src/lib/events.ts`, types/fixtures.
- **Acceptance:** Published events remain usable; organizer metadata is display-only; event teams and management controls are absent.
- **Tests:** Mock event discovery/detail/registration/reminder smoke tests.
- **Risk/rollback:** Keep mock adapter until real API cutover.
- **Estimate:** 3–4 hours.
- **Gate:** Phase 1 approval.

### P1.4 Update mock contracts and disabled screens

- **Objective:** Retain attendee event fixtures and replace non-MVP areas with disabled “Coming soon” screens.
- **Dependencies:** P1.2, P1.3.
- **Affected:** `prototype/src/data/mockBackend.ts`, types, navigation, notifications, Notes/Clubs/Marketplace/Opportunities/Assistant screens.
- **Acceptance:** Mock published/full/waitlisted/cancelled events work; no organizer/event-team fixture remains; disabled screens cannot perform actions.
- **Tests:** Fixture contract, route, and Expo startup tests.
- **Risk/rollback:** Additive fixture changes first.
- **Estimate:** 3 hours.
- **Gate:** Owner approves Phase 1 before backend work.

## Phase 2 — Supabase Foundation and Schema

### P2.1 Scaffold `backend/` and local configuration

- **Objective:** Add Supabase-oriented backend workspace, environment templates, scripts, and documentation without creating external resources.
- **Dependencies:** Phase 1 approval, P0.2.
- **Affected:** `backend/`, root workspace config if approved.
- **Acceptance:** Local commands work; missing credentials fail clearly; no secrets committed.
- **Tests:** Install, lint, typecheck, config validation.
- **Risk/rollback:** Remove only new scaffold files if rejected.
- **Estimate:** 2 hours.
- **Gate:** Technical approval.

### P2.2 Add SQL migrations, RLS, and seed workflow

- **Objective:** Establish local Supabase/Postgres migrations, extensions, RLS baseline, and deterministic seed execution.
- **Dependencies:** P2.1.
- **Affected:** `backend/supabase/migrations/`, `seed.sql`, README.
- **Acceptance:** Clean migration/rerun/seed works; every user-facing table has RLS; production cannot use dev seed automatically.
- **Tests:** Migration and RLS positive/negative tests.
- **Risk/rollback:** Never edit applied migrations; use additive migrations.
- **Estimate:** 3–4 hours.
- **Gate:** Schema review.

### P2.3 Add identity, campus, profile, and consent schema

- **Objective:** Implement users, campuses/domains, profiles, skills, interests, links, privacy, discoverability, age confirmation, and consent.
- **Dependencies:** P2.2.
- **Affected:** SQL migrations and generated database types.
- **Acceptance:** One active campus, globally unique username, privacy fields, consent timestamps, and cross-user RLS isolation work.
- **Tests:** Constraints and RLS tests.
- **Risk/rollback:** Avoid collecting unnecessary identity data.
- **Estimate:** 3 hours.
- **Gate:** None.

### P2.4 Add event attendee schema

- **Objective:** Implement public organizer metadata, published events, registrations, waitlist, bookmarks, reminders, and event changes.
- **Dependencies:** P2.2.
- **Affected:** SQL migrations, generated types, import schema.
- **Acceptance:** Published/audience filtering, unique registration, capacity/deadline/waitlist, timezone-safe reminders, and no student event-authoring path.
- **Tests:** Concurrent registration, promotion, cancellation, timezone, and RLS tests.
- **Risk/rollback:** Preserve registration history when status changes.
- **Estimate:** 4 hours.
- **Gate:** Event schema approval.

### P2.5 Add social, team, chat, notification, moderation, and analytics schema

- **Objective:** Add posts/comments/reactions/bookmarks, Team Finder, connections/follows, rooms/messages, notifications/devices, blocks/reports/audit, and consented product events.
- **Dependencies:** P2.2, P2.3.
- **Affected:** SQL migrations and generated types.
- **Acceptance:** Foreign keys, uniqueness, soft deletion, campus keys, message client IDs, safety targets, and analytics minimization are enforced.
- **Tests:** Migration, constraint, index, and RLS tests.
- **Risk/rollback:** Split large migrations.
- **Estimate:** 4 hours.
- **Gate:** Schema approval.

### P2.6 Seed the current mock data

- **Objective:** Convert mock users/posts/events/teams/relationships into deterministic local fixtures.
- **Dependencies:** P2.3–P2.5.
- **Affected:** `prototype/src/data/mockBackend.ts`, `backend/supabase/seed.sql`, seed scripts.
- **Acceptance:** Owner/applicant/connected/blocked/moderator/student and event state fixtures are resettable and never auto-seed production.
- **Tests:** Seed smoke and fixture-count assertions.
- **Risk/rollback:** Development-only.
- **Estimate:** 3 hours.
- **Gate:** None.

## Phase 3 — Auth, Onboarding, Profiles

### P3.1 Integrate Supabase email OTP and sessions

- **Objective:** Replace mock OTP in selected environments; keep explicit local test adapter.
- **Dependencies:** P2.1–P2.3, external approval.
- **Affected:** `prototype/src/lib/auth.ts`, API client, auth screens, policies.
- **Acceptance:** OTP, restart persistence, refresh, non-destructive session expiry, logout-all, and rate limits work.
- **Tests:** OTP, expiry, refresh, restart, logout-all.
- **Risk/rollback:** No silent production mock fallback.
- **Estimate:** 4 hours.
- **Gate:** Auth demo approval.

### P3.2 Implement campus verification and onboarding

- **Objective:** Collect required profile, consent, age, campus, availability, skills, and interests.
- **Dependencies:** P3.1.
- **Affected:** Onboarding screens/hooks and policies/functions.
- **Acceptance:** Manual/normal-email fallback policy, minimum age, terms consent, one campus, validation, and resume behavior work.
- **Tests:** Validation, duplicate username, verification, consent, resume.
- **Risk/rollback:** Do not store unnecessary identity data.
- **Estimate:** 4 hours.
- **Gate:** Onboarding approval.

### P3.3 Connect profiles, privacy, discovery, and suggestions

- **Objective:** Implement profile editing, links, visibility, discoverability, filters, and suggestions.
- **Dependencies:** P3.2.
- **Affected:** Profile/student-discovery screens and account hooks.
- **Acceptance:** Private/cross-campus/context rules, global usernames, skills/interests, and no organizer badges work.
- **Tests:** Visibility, discovery, block, and profile update tests.
- **Risk/rollback:** Server/RLS enforcement is authoritative.
- **Estimate:** 4 hours.
- **Gate:** None.

## Phase 4 — Student Event Access

### P4.1 Connect event discovery and search

- **Objective:** Replace event mock reads with published-event queries, campus filters, search, sorting, and cursor pagination.
- **Dependencies:** P2.4, P3.1.
- **Affected:** `prototype/src/lib/events.ts`, event hooks/screens.
- **Acceptance:** Only eligible published events appear; details expose attendee-safe metadata; filters/search/pagination work.
- **Tests:** RLS, filter, search, pagination, cancellation visibility.
- **Risk/rollback:** Local seed adapter only.
- **Estimate:** 3 hours.
- **Gate:** None.

### P4.2 Implement save, registration, cancellation, capacity, and waitlist

- **Objective:** Implement attendee participation without organizer mutations.
- **Dependencies:** P4.1.
- **Affected:** Event API/hooks/screens and SQL functions/RLS.
- **Acceptance:** Save differs from register; duplicates are idempotent; waitlist promotes exactly once; student event writes are denied.
- **Tests:** Concurrency, promotion, cancellation, authorization-negative, idempotency.
- **Risk/rollback:** Transactional database functions.
- **Estimate:** 4 hours.
- **Gate:** Event participation approval.

### P4.3 Implement reminders and event-change handling

- **Objective:** Schedule default/student reminders and handle time, venue, and cancellation updates.
- **Dependencies:** P2.4, P4.2, notification foundation.
- **Affected:** Reminder tables/job, notification UI.
- **Acceptance:** Disable/default/offset/timezone behavior, retries, duplicate prevention, and update/cancellation notices work.
- **Tests:** Scheduler, timezone, retry, cancellation, preference.
- **Risk/rollback:** Disable scheduler without deleting records.
- **Estimate:** 4 hours.
- **Gate:** Reminder approval.

### P4.4 Add event-linked posts and attendee utilities

- **Objective:** Support event cards in feed, sharing, calendar/maps links, past events, and public organizer links.
- **Dependencies:** P4.1 and posts foundation.
- **Affected:** Feed cards, event navigation/deep links.
- **Acceptance:** Links open attendee details only and never expose management controls.
- **Tests:** Deep-link, URL, platform-link, event-card smoke.
- **Risk/rollback:** Feature-flag utilities if deadline is threatened.
- **Estimate:** 2–3 hours.
- **Gate:** None.

## Phase 5 — Posts and Feed

### P5.1 Implement approved post formats, visibility, media, and ownership

- **Objective:** Support 2,000-character posts, approved formats, campus/global visibility, event/team links, and media limits.
- **Dependencies:** P2.5, P3.3.
- **Affected:** Composer, post schema/RLS, Storage if approved.
- **Acceptance:** Server allowlist, validation, visibility, edit/delete, ownership, and media policy work.
- **Tests:** Validation, RLS, media, visibility, ownership.
- **Risk/rollback:** Text-only fallback if storage is not approved.
- **Estimate:** 4 hours.
- **Gate:** None.

### P5.2 Implement newest-first feed and cursor pagination

- **Objective:** Deliver stable newest-first feed with filtering and retry states.
- **Dependencies:** P5.1.
- **Affected:** Feed RPC/hooks/screen.
- **Acceptance:** Stable ordering, no blocked/removed/private leakage, no duplicate/gap pagination.
- **Tests:** Cursor, authorization, insert-between-pages, loading/error/empty.
- **Risk/rollback:** Keep chronological ranking.
- **Estimate:** 3 hours.
- **Gate:** Feed approval.

### P5.3 Implement comments, reactions, bookmarks, and deletion

- **Objective:** Implement one final reaction model, final comment depth, private bookmarks, edits/deletes, and counts.
- **Dependencies:** P5.1–P5.2 and P0.1.
- **Affected:** Post detail/comments/bookmarks and SQL/RLS.
- **Acceptance:** Only one approved reaction/comment behavior is exposed; retries are consistent.
- **Tests:** Duplicate reaction/bookmark, comment auth, edit/delete, pagination, counts.
- **Risk/rollback:** Default to like-only and flat comments.
- **Estimate:** 4 hours.
- **Gate:** Posts approval.

## Phase 6 — Team Finder

### P6.1 Implement request creation, discovery, matching, and expiry

- **Objective:** Support approved team types, required fields, cross-campus policy, sizes 2–10, expiry, filters, and deterministic skill/interest matching.
- **Dependencies:** P2.5, P3.3.
- **Affected:** Team Finder routes/screens/hooks/schema/RLS.
- **Acceptance:** No event/organizer dependency; blocked/closed/expired requests are excluded; sizes and required fields enforce.
- **Tests:** Validation, matching, expiry, campus, blocks.
- **Risk/rollback:** Deterministic matching only.
- **Estimate:** 4 hours.
- **Gate:** None.

### P6.2 Implement applications and membership state machine

- **Objective:** Implement one final join flow, application payload, owner decisions, withdraw/reapply, invites, ownership, close/reopen, and cancel.
- **Dependencies:** P6.1, P0.1.
- **Affected:** Team detail/new-team/application screens and SQL functions/RLS.
- **Acceptance:** Capacity cannot be exceeded under concurrency; owner actions are protected; membership is transactional.
- **Tests:** Concurrent accept, duplicate/reapply, ownership, leave/remove, expiry, auth.
- **Risk/rollback:** Default to apply-and-owner-approve.
- **Estimate:** 4 hours.
- **Gate:** Team Finder approval.

### P6.3 Integrate team chat membership

- **Objective:** Create team chat at the approved lifecycle point and keep team/chat membership synchronized.
- **Dependencies:** P6.2 and chat foundation.
- **Affected:** Team/chat integration.
- **Acceptance:** One chat creation rule; removed/leaving members cannot read old messages if approved; no membership drift.
- **Tests:** Transaction, leave/remove, history access, reconnect.
- **Risk/rollback:** Repair script for local development.
- **Estimate:** 2–3 hours.
- **Gate:** None.

## Phase 7 — Connections and Chat

### P7.1 Implement connections and following

- **Objective:** Implement connection requests, following if retained, visibility, cooldown, suggestions, and block effects.
- **Dependencies:** P2.5, P3.3.
- **Affected:** Relationship screens/hooks/schema/RLS.
- **Acceptance:** Explicit idempotent states; following and connections are distinct; block rules apply.
- **Tests:** State machine, duplicates, cooldown, blocks, visibility, suggestions.
- **Risk/rollback:** Hide following UI if it is not needed for first cut.
- **Estimate:** 3–4 hours.
- **Gate:** None.

### P7.2 Implement direct and team chat rooms

- **Objective:** Implement accepted-connection direct chat and team chat; defer event/general groups unless approved.
- **Dependencies:** P7.1, P6.2.
- **Affected:** Chat screens, rooms/messages, Realtime policies.
- **Acceptance:** Room authorization, idempotent direct room, explicit membership, and no accidental event chat.
- **Tests:** REST/RLS/realtime authorization, duplicate room, membership, block.
- **Risk/rollback:** Direct/team chat only.
- **Estimate:** 4 hours.
- **Gate:** Chat foundation approval.

### P7.3 Implement message lifecycle and realtime reconciliation

- **Objective:** Implement approved text/file/link/GIF/system messages, edit/delete limits, read/unread, typing/presence, replies, reactions, and search.
- **Dependencies:** P7.2.
- **Affected:** `prototype/src/lib/realtime-chat-protocol.ts`, `realtime-chat.ts`, chat hooks/screens.
- **Acceptance:** Client IDs deduplicate optimistic sends; reconnect recovers; membership is checked on every operation; delivery target is measured.
- **Tests:** Duplicate, reconnect, out-of-order, edit/delete, read, typing, presence, search.
- **Risk/rollback:** Ship persisted text, unread, reads, and reconnect first if needed.
- **Estimate:** 4 hours.
- **Gate:** Chat approval.

## Phase 8 — Notifications, Email, and Reminders

### P8.1 Implement in-app notification outbox

- **Objective:** Generate reliable notifications with separate category preferences, quiet hours, batching, and pagination.
- **Dependencies:** P2.5, P3.1.
- **Affected:** Notification schema/hooks/screens and Edge Functions.
- **Acceptance:** Committed actions create retry-safe notifications; preferences and read states work.
- **Tests:** Outbox retry, duplicate, preference, quiet-hours, batching, pagination.
- **Risk/rollback:** Keep event reminders separately flaggable.
- **Estimate:** 3–4 hours.
- **Gate:** Notification approval.

### P8.2 Add approved email delivery

- **Objective:** Send OTP and approved notification emails through an approved free-tier provider.
- **Dependencies:** P0.2, P8.1.
- **Affected:** Edge Functions/jobs/templates/environment.
- **Acceptance:** Provider approved; retries/observability/preferences work; private message content is not exposed by default.
- **Tests:** Template, invalid address, retry, sandbox delivery.
- **Risk/rollback:** In-app only until credentials are approved.
- **Estimate:** 2–3 hours.
- **Gate:** External-service approval.

### P8.3 Reconcile event reminder channel

- **Objective:** Confirm in-app/email versus Expo push and implement the approved delivery channel.
- **Dependencies:** P4.3, P8.1, P8.2.
- **Affected:** Reminder job, device-token registration, preferences.
- **Acceptance:** Channel decision recorded; no duplicate delivery; opt-out works; tokens are protected.
- **Tests:** End-to-end reminder delivery, retry, duplicate, opt-out.
- **Risk/rollback:** Default to in-app plus approved email; defer push without approval.
- **Estimate:** 2–3 hours.
- **Gate:** Product/external-service approval.

## Phase 9 — Search, Moderation, Settings, Analytics

### P9.1 Implement privacy-aware search

- **Objective:** Search profiles, events, posts, teams, and optionally messages using campus/global visibility rules.
- **Dependencies:** P3.3, P4.1, P5.2, P6.1, P7.3.
- **Affected:** Search indexes/RPC, screen/hooks.
- **Acceptance:** Per-type filters exist; blocked/private/removed content is excluded; approved cross-campus content is visible only by its rule.
- **Tests:** FTS/trigram, visibility, blocks, deletion, pagination, message authorization.
- **Risk/rollback:** Defer message search/autocomplete if needed.
- **Estimate:** 3–4 hours.
- **Gate:** Search review.

### P9.2 Implement blocking and reports

- **Objective:** Apply blocks/reports to profiles, posts, comments, messages, teams/applications, and events.
- **Dependencies:** P2.5, P3.3.
- **Affected:** Safety screens/hooks, blocks/reports/RLS.
- **Acceptance:** Block prevents discovery/connections/direct chat/team applications per final rule; reports are rate-limited and auditable.
- **Tests:** Cross-feature block matrix, report authorization, rate limits, visibility.
- **Risk/rollback:** Blocking remains reversible with audit history.
- **Estimate:** 3 hours.
- **Gate:** Safety approval.

### P9.3 Implement separate moderator/support workflow

- **Objective:** Provide protected pilot-team moderation actions separate from organizer permissions.
- **Dependencies:** P9.2, P0.2.
- **Affected:** Protected Edge Functions/RPC, moderation/audit tables.
- **Acceptance:** Dismiss, hide/remove, warn, suspend, ban, restrict, escalation, appeal, and 24-hour handling target are documented/enforced.
- **Tests:** Role-negative, action authorization, audit, suspension, appeal.
- **Risk/rollback:** Minimal protected tooling; no mobile admin dashboard.
- **Estimate:** 4 hours.
- **Gate:** Moderator-owner approval.

### P9.4 Capture consented internal analytics

- **Objective:** Record aggregate product events for signup, activation, event conversion, posts, teams, connections, chat, retention, reports, and blocks.
- **Dependencies:** P0.1, P2.5, P3.2.
- **Affected:** Analytics table/RPC, consent settings, domain hooks.
- **Acceptance:** Non-essential consent is recorded; no message bodies/OTP/secrets; aggregate admin queries are safe.
- **Tests:** Consent, event schema, redaction, idempotency, aggregate queries.
- **Risk/rollback:** Disable analytics without affecting product actions.
- **Estimate:** 3 hours.
- **Gate:** Privacy/product approval.

### P9.5 Implement account deletion, export, and settings

- **Objective:** Implement settings, logout-all, immediate disable, deletion grace period, cleanup, and data export.
- **Dependencies:** P3.1, P8.1, P9.4.
- **Affected:** Settings screens, deletion/export functions/jobs.
- **Acceptance:** 30-day grace period/default retention is enforced or replaced by approved values; export is authorized/redacted; audit retention is documented.
- **Tests:** Deletion, export, redaction, grace period, session revocation, cleanup retry.
- **Risk/rollback:** Never permanently delete real users during development.
- **Estimate:** 3–4 hours.
- **Gate:** Privacy/release approval.

## Phase 10 — Verification and Closed-Pilot Release

### P10.1 Implement mandatory automated tests and CI

- **Objective:** Run backend unit, database integration, OpenAPI contract, authorization/security, realtime, mobile component, mobile E2E, and load tests.
- **Dependencies:** Phases 2–9.
- **Affected:** `backend/test/`, prototype tests, `.github/workflows/`.
- **Acceptance:** All Q18.2 categories exist and critical negative paths pass.
- **Tests:** The complete test suite plus CI failure reporting.
- **Risk/rollback:** Split slow E2E from PR checks but retain release gate.
- **Estimate:** 4 hours.
- **Gate:** Technical approval.

### P10.2 Validate performance targets

- **Objective:** Test 100 concurrent users, 200 ms API target where realistic, and 500 ms chat delivery target.
- **Dependencies:** P10.1, approved non-production environment.
- **Affected:** Load scripts, indexes, Realtime configuration.
- **Acceptance:** p95 results and mitigations are recorded; production is never load-tested.
- **Tests:** Auth/feed/events/teams/search/chat/notification/report scenarios.
- **Risk/rollback:** Use local/staging only.
- **Estimate:** 3 hours.
- **Gate:** Release-readiness approval.

### P10.3 Configure environments and GitHub Actions

- **Objective:** Configure local, development, staging, and production workflows using approved free-tier resources.
- **Dependencies:** P0.2, P2.1, P10.1.
- **Affected:** `.github/workflows/`, environment docs, Supabase configuration.
- **Acceptance:** No secrets in Git; migrations and staging deploy are approval-gated; production deploy is manual.
- **Tests:** CI dry run, migration check, secret scan, staging smoke.
- **Risk/rollback:** Stop before external resource creation without approval.
- **Estimate:** 3 hours.
- **Gate:** Owner approval.

### P10.4 Backups, monitoring, and incident runbook

- **Objective:** Document free-tier backup limits, restore steps, health checks, logging, alerts, and rollback.
- **Dependencies:** P10.3.
- **Affected:** `docs/operations_runbook.md`, health checks/provider settings.
- **Acceptance:** Restore rehearsal, failure alerting, owner contact, and rollback steps are documented.
- **Tests:** Restore and forced-failure alert tests.
- **Risk/rollback:** Free-tier limitations are explicitly accepted.
- **Estimate:** 3 hours.
- **Gate:** Owner approval.

### P10.5 Closed-pilot acceptance

- **Objective:** Run the complete student journey and record release approval.
- **Dependencies:** P10.1–P10.4.
- **Affected:** Staging build, release checklist, test accounts.
- **Acceptance:** Auth, profile, event attendee, feed, Team Finder, connections, chat, notifications, search, safety, settings, iOS 17+/Android 14+ checks, and organizer-negative checks pass.
- **Tests:** Full E2E/regression/release checklist.
- **Risk/rollback:** Keep prior prototype build available as fallback.
- **Estimate:** 3–4 hours.
- **Gate:** Product owner release approval.

## 4. Cross-Cutting Definition of Done

- No mobile organizer/professional route, role, dashboard, or event-management mutation is reachable.
- Student event discovery, details, save/register, waitlist, reminders, and event updates work.
- Team Finder has no event-team or organizer-role dependency.
- Auth, profile privacy, campus isolation, blocks, reports, and moderation are server-enforced.
- API contracts, migrations, RLS policies, tests, seed data, and environment docs are committed.
- Production cannot silently use mock data.
- External services are created/configured only after owner approval.
- CI, migration, security, load, backup, and closed-pilot checks pass.
- Every phase has recorded approval before the next phase starts.

## 5. Recommended First Task

Start with `P1.1 — Inventory mobile boundary`.

It is read-only, matches your requested first priority, preserves attendee event access, and does not require external credentials or irreversible changes.

## 6. Approval Request

Reply with one of these:

```text
Approve Phase 1 and P1.1.
```

or:

```text
Change the task plan first:
- [task IDs or decisions to change]
```

After Phase 1, Codex will stop and ask whether to continue to Phase 2.
