# CampusSphere Admin Web Plan

**Status:** Mock design implementation in progress. Admin UI uses local mock data only; no admin API or role migration is connected yet.

**Scope:** Build a separate desktop-first web application under `admin-web/` for authorized staff. The mobile app remains student-only: event discovery, details, registration, saving, and reminders. Mobile users never receive admin or organizer write permissions.

## 1. Product Shape

CampusSphere needs three protected admin experiences with one shared shell:

1. **Campus Admin Portal**
   - Scoped to exactly one assigned campus.
   - Creates Event Manager accounts for that campus.
   - Moderates all campus posts and manages campus operations.
   - Cannot manage another campus or create Campus Admin or Super Admin accounts.

2. **Event Manager Portal**
   - Created and assigned by a Campus Admin.
   - Scoped to that Campus Admin's campus.
   - Manages event drafts, publishing, registrations, capacity, waitlists, schedules, venues, media, and event notifications.
   - Cannot moderate general posts or manage users, staff, permissions, campuses, or platform health.

3. **Super Admin Console**
   - Global platform scope across campuses.
   - Creates and manages campuses, Campus Admins, Event Managers, all content, moderation, catalog data, feature rollout, audit history, and platform health.
   - Read health telemetry through protected server endpoints. Never expose database credentials or arbitrary SQL to the browser.

The two experiences share authentication, layout, tables, filters, audit display, notifications, and error handling. Route guards and server authorization decide which modules appear and which requests are allowed.

## 2. Current Backend Constraints

Existing backend decisions remain authoritative:

- `public.events` and `public.event_organizers` already model event publishing and public organizer metadata.
- Mobile API has attendee operations only. It has no event create, edit, publish, cancel, attendee-admin, analytics, or dashboard operation.
- `public.staff_roles` currently supports protected `moderator`, `support`, and `admin` roles. It is service-role managed and not writable by mobile clients.
- Moderation uses protected RPCs such as `list_moderation_queue`, `list_moderation_audit`, and `apply_moderation_action`.
- `audit_logs` and `moderation_actions` are append-only evidence surfaces for protected actions.
- Supabase Auth, RLS, RPCs, private Storage, Realtime, and backend workers remain the platform primitives.

Admin web must consume these boundaries. It must not bypass them with direct table writes from browser code.

## 3. Role Model

Panel type and permission role are separate concepts. A user may see the same shell but receives different modules and scopes.

### 3.1 Roles

| Role | Panel | Scope | Main capability |
|---|---|---|---|
| `campus_admin` | Campus Admin Portal | Exactly one assigned `campus_id` | Manage campus posts, campus operations, and Event Manager accounts |
| `event_manager` | Event Manager Portal | Assigned `campus_id` | Manage event lifecycle and event operations only |
| `moderator` | Campus Admin Portal | Assigned campus, or global only when explicitly assigned | Review reports and apply moderation actions allowed by policy |
| `support` | Campus Admin Portal | Assigned campus | Read support-safe account/event context; no content removal or role grants |
| `super_admin` | Super Admin Console | Global | All admin operations, staff assignments, global moderation, health, audit, and release controls |
| `auditor` | Super Admin Console | Global read-only | Read approved operational/audit views; no writes |

`admin` in the existing `staff_roles` table must not silently become global super admin. During migration, map legacy `admin` rows explicitly to `campus_admin` or `super_admin`, record who approved the mapping, and revoke ambiguous assignments.

### 3.2 Permission format

Every request is evaluated as:

```text
can(actor, action, resource, scope, context)
```

- `actor`: authenticated user and active staff assignments.
- `action`: `read`, `create`, `update`, `publish`, `cancel`, `moderate`, `export`, `assign_role`, `operate`, or `delete`.
- `resource`: `event`, `post`, `resource`, `listing`, `club`, `notification`, `report`, `user`, `staff_assignment`, `audit`, `health`, `catalog`, or `feature_flag`.
- `scope`: assigned campus, assigned organization, or global.
- `context`: ownership, status transition, target campus, sensitivity, and approval state.

Default is deny. UI hiding is convenience only; backend policy is authoritative.

## 4. Permission Matrix

| Resource | Campus admin | Content manager | Moderator | Support | Super admin | Auditor |
|---|---|---|---|---|---|---|
| Own/assigned events | Read operational status; no lifecycle write by default | Create, edit, publish, cancel, complete | Read; hide linked unsafe content | Read basic status | All campuses and organizers | Read |
| Event registrations | Read aggregate and operational attendee data | No access by default | Read only when needed for report | Read support-safe status | Full operational access with privacy limits | Read aggregate |
| Campus announcements/posts | Create and manage assigned content | Create/draft/edit assigned content | Hide/remove after report policy | Read | All content and global controls | Read |
| Clubs/communities | Manage assigned verified entities if granted | Draft/edit assigned entity | Moderate reports | Read | All campuses | Read |
| Study resources/listings | Review only if explicit assignment exists | Draft metadata only | Moderate reports | Read support-safe state | Global review and lifecycle | Read |
| Reports/moderation | No action unless also moderator | No action | Queue/action within scope | Escalate only | All actions, appeals, policy | Read audit |
| Users/profiles | Read minimum campus context | No access | Read minimum context for report | Support-safe lookup | Global restricted lookup | Read redacted views |
| Notifications | Send event/owned-content updates | Draft notification | Safety notices only through workflow | No send | Global templates, campaigns, delivery controls | Read |
| Staff assignments | Create/manage Event Managers in own campus | No | No | No | Grant/revoke/expire Campus Admins and Event Managers globally | Read |
| Audit logs | Read own actions and assigned scope | Read own actions | Read moderation actions in scope | Read support actions | Global read/export | Read |
| Database/platform health | No | No | No | No | Read health and operate approved jobs | Read |
| Feature flags/catalog | No | No | No | No | Global change with audit/approval | Read |

Sensitive attendee contact details, private messages, report evidence, and account security fields require a separate policy check even for `super_admin`. Return minimum fields needed for task.

## 5. Admin Workflows

### 5.1 Login and context

1. Admin opens admin domain.
2. Supabase Auth signs in through PKCE/email OTP. MFA is deferred for the first prototype; architecture leaves a step-up slot for later.
3. Server resolves active assignments through `/admin/v1/me`.
4. User selects an assigned campus or global scope. Client never invents `campus_id`.
5. Route guard loads only modules allowed by the resolved policy.
6. Revocation, expiry, account suspension, or campus reassignment invalidates access on the next request and via session refresh.

### 5.2 Event lifecycle

```text
draft -> review (optional) -> published -> completed
                         \-> cancelled
```

- Create draft with validated title, dates, venue, capacity, audience, organizer, media, and public contact metadata.
- Preview attendee view before publish.
- Publish transactionally; record actor, scope, version, and timestamp in audit log.
- Edit published event through version/optimistic-concurrency check.
- Time/venue/cancellation changes create `event_changes` and enqueue affected attendee/reminder notifications.
- Cancel never hard-deletes registered event history.
- Capacity and registration rules remain transactional; admin cannot bypass waitlist invariants.

### 5.3 Post and announcement lifecycle

- Campus admin creates only campus-scoped content for assigned campus/organization.
- Global posts require `super_admin` or separately approved global publisher permission.
- Draft, preview, publish, edit, hide, restore, and soft-delete are explicit transitions.
- Every moderation or delete action requires reason code and audit entry.
- Media uses private Storage and short-lived signed URLs.

### 5.4 Moderation workflow

1. Queue reports by status, type, campus, age, and severity.
2. Show minimum evidence required for decision.
3. Apply allowed action: dismiss, hide, remove, warn, restrict, suspend, ban, escalate, or appeal.
4. Write `moderation_actions` and `audit_logs` in one protected transaction.
5. Notify affected user only through approved templates; never expose reporter identity unless policy allows.
6. Super admin can review cross-campus trends and appeals, but cannot rewrite audit history.

### 5.5 Platform health workflow

Health page is read-only by default. Backend health endpoint reports:

- Supabase Auth, PostgREST, Storage, and Realtime reachability.
- Migration version and schema drift status.
- Database connection/error/latency summary from trusted server-side checks.
- Notification/outbox/domain-job queue depth, oldest pending item, and failure count.
- Storage failures and scan/quarantine backlog.
- Recent deploy/build version and environment.
- RLS smoke-check result and last successful verification timestamp.

Operations buttons are separate from health cards and require `super_admin`, explicit confirmation, idempotency key, and audit record. No arbitrary SQL console, credential display, or destructive one-click reset.

## 6. Backend/API Boundary

Create a protected `/admin/v1` namespace. Browser requests use the user's Supabase access token. A server-side Edge Function/API layer performs policy checks and calls transaction-safe RPCs.

### 6.1 Initial endpoints

```text
GET    /admin/v1/me
GET    /admin/v1/navigation
GET    /admin/v1/dashboard/summary

GET    /admin/v1/events
POST   /admin/v1/events
GET    /admin/v1/events/:id
PATCH  /admin/v1/events/:id
POST   /admin/v1/events/:id/publish
POST   /admin/v1/events/:id/cancel
POST   /admin/v1/events/:id/complete
GET    /admin/v1/events/:id/registrations
POST   /admin/v1/events/:id/notifications

GET    /admin/v1/posts
POST   /admin/v1/posts
PATCH  /admin/v1/posts/:id
POST   /admin/v1/posts/:id/publish
POST   /admin/v1/posts/:id/hide
POST   /admin/v1/posts/:id/restore

GET    /admin/v1/reports
POST   /admin/v1/reports/:id/action
GET    /admin/v1/moderation/audit

GET    /admin/v1/health
GET    /admin/v1/health/history
GET    /admin/v1/jobs
POST   /admin/v1/jobs/:id/retry

GET    /admin/v1/super/content
GET    /admin/v1/super/users
GET    /admin/v1/super/staff
POST   /admin/v1/super/staff
PATCH  /admin/v1/super/staff/:id
GET    /admin/v1/super/audit
GET    /admin/v1/super/catalog
PATCH  /admin/v1/super/feature-flags/:key
```

Endpoint names are a plan contract. Implement only after request/response schemas, policy tests, and RLS/RPC ownership are approved.

### 6.2 Data changes required

Add forward-only migration(s), coordinated with existing migration ownership:

- `admin_role_assignments`: one row per user/role/scope assignment; `campus_id`, optional `organizer_id`, granted/revoked timestamps, grantor, reason, expiry.
- `admin_permission_overrides`: allow only reviewed additive permissions; no arbitrary client-defined permission strings.
- `admin_action_idempotency`: actor, key, route, request hash, result reference, expiry.
- `admin_health_snapshots`: server-written health summaries, timestamps, environment, check version, redacted details.
- `admin_content_versions`: optional event/post version history if existing tables cannot provide safe optimistic concurrency.
- `admin_approvals`: required for super-admin role grants, global publishing, destructive operations, and feature-flag changes.

Reuse `staff_roles`, `audit_logs`, `moderation_actions`, `events`, `event_changes`, `reports`, and existing notification/outbox tables where their semantics fit. Do not duplicate moderation or audit tables.

## 7. `admin-web/` Folder Layout

```text
admin-web/
  app/                         # Next.js routes and layouts
    (auth)/login/
    (auth)/verify/
    (auth)/mfa/
    (admin)/layout.tsx         # authenticated shell + assignment guard
    (admin)/dashboard/
    (admin)/events/
    (admin)/posts/
    (admin)/communities/
    (admin)/resources/
    (admin)/moderation/
    (admin)/notifications/
    (super)/layout.tsx         # super-admin guard
    (super)/health/
    (super)/content/
    (super)/users/
    (super)/staff/
    (super)/audit/
    (super)/catalog/
    (super)/settings/
    api/                        # server-only proxy/health handlers if needed
  src/
    auth/                       # session, MFA, route guards
    permissions/                # policy types, capability checks, scope context
    api/                        # typed admin client; no service key
    components/
      shell/                    # nav, context switcher, command/search
      tables/                   # pagination, filters, bulk selection
      forms/                    # validated admin forms
      feedback/                 # errors, confirmation, audit reason dialogs
    features/
      campus-admin/
        dashboard/
        events/
        posts/
        communities/
        resources/
        notifications/
        moderation/
      super-admin/
        health/
        content/
        users/
        staff/
        audit/
        catalog/
        jobs/
        feature-flags/
    lib/                        # dates, formatting, redaction, telemetry
    types/                      # generated API contracts
  tests/
    unit/
    permissions/
    integration/
    e2e/
      campus-admin/
      super-admin/
  public/
  middleware.ts
  package.json
  .env.example
  README.md
```

The admin app is independent from `prototype/`. Do not import mobile screens, mobile stores, or mobile service-role workarounds into this folder.

## 8. UI Rules

- Desktop-first tables, filters, split panes, and keyboard-friendly forms; responsive fallback for tablet.
- Persistent campus/scope context visible in header; every list shows active scope.
- Every screen has loading, empty, error, permission-denied, and stale-data states.
- Destructive actions require reason, confirmation, and visible affected scope.
- Bulk actions show exact count and sample targets before submit.
- Audit timeline appears beside sensitive edits.
- PII is masked by default; reveal requires a purpose-specific permission.
- No dashboard card claims a feature is live when backend flag/status says staged.

## 9. Security Model

- Supabase Auth PKCE for browser login; MFA step-up for super admin and high-risk operations.
- Short-lived access tokens; secure refresh handling; logout-all on revocation.
- Admin API verifies JWT, staff assignment, role, campus/organizer scope, account status, and action policy on every request.
- RLS remains defense in depth. Service-role key exists only in server runtime/Edge Functions, never in `admin-web` client bundle or `.env` exposed to Next.js browser code.
- All writes require idempotency where retry can duplicate events, notifications, posts, role grants, or job retries.
- Sanitize rich text and links; allow HTTPS only; protect uploads with MIME sniff, quarantine, scan, and signed downloads.
- Append-only audit for login/MFA, reads of sensitive data, role grants/revokes, publish/cancel, moderation, exports, retries, and feature flags.
- Rate-limit login, exports, bulk actions, notification sends, and moderation actions.
- Super-admin role grant/revoke requires two-person approval or explicit owner approval workflow.

## 10. Rollout Phases

### Phase A - Contracts and authorization foundation

- Freeze role names, scopes, resource/action vocabulary, error envelope, pagination, and audit fields.
- Add `admin_role_assignments` and migration/backfill plan for existing `staff_roles`.
- Implement policy functions and negative tests before UI.
- Add protected `/admin/v1/me` and `/admin/v1/navigation`.

### Phase B - Shared admin shell

- Create `admin-web` app, Auth/MFA, route guards, context switcher, table/form primitives, telemetry, and error states.
- Ship read-only dashboard summary for assigned scope.

### Phase C - Campus Admin Portal

- Event draft/create/edit/preview/publish/cancel/complete.
- Registration and waitlist operational views.
- Owned campus posts/announcements.
- Event update notifications with outbox/idempotency.
- Scoped moderation and content queues where granted.

### Phase D - Super Admin Console

- Global content search and moderation.
- Staff assignments, approvals, expiry, and audit.
- Database/platform health, queue/job views, and safe retry controls.
- Catalog, feature flags, environment banner, and release controls.

### Phase E - Pilot verification

- Seed dedicated campus-admin, moderator, support, auditor, and super-admin accounts in non-production.
- Run authorization matrix, cross-campus negative tests, concurrency tests, audit checks, health degradation tests, and browser E2E.
- Owner approves production role grants and domain/SSO/MFA configuration.

## 11. Acceptance Gates

### Campus admin gates

- Can create and publish an event only inside assigned campus/organization.
- Cannot read or mutate another campus event, global post, staff role, audit history, or database health.
- Event edits enforce version conflict handling and generate attendee updates.
- Registration counts never expose unnecessary contact data.
- Every write has actor, scope, reason where required, request ID, and audit row.

### Super admin gates

- Can inspect all permitted campuses/content through paginated, filtered views.
- Can assign/revoke scoped staff roles with approval, expiry, and audit history.
- Can execute moderation and safe job retry actions; cannot erase audit history.
- Health page remains useful when one provider/job is down and never displays secrets.
- Global publish, bulk operations, exports, and destructive changes require explicit confirmation and idempotency.

### Shared gates

- Student/mobile JWT cannot call admin write endpoints.
- Campus admin cannot escalate by changing request body/query `campus_id`.
- Revoked/expired staff access fails immediately after token/assignment refresh.
- RLS and API policy tests agree; neither depends only on UI route hiding.
- No service-role secret appears in bundle, source map, logs, or browser network payload.
- Typecheck, lint, unit, integration, permission, and browser E2E pass before release.

## 12. Explicit Non-Goals

- No organizer/admin dashboard inside mobile app.
- No arbitrary SQL editor or database reset button.
- No service-role credentials in browser code.
- No unbounded cross-campus access for campus admins.
- No hard deletion of events/posts/users from normal admin UI; use audited soft-delete/lifecycle workflows.
- No payment, escrow, or event ticket settlement.
- No AI decision-making for moderation, role grants, or access policy.

## 13. Decisions Confirmed

1. `campus_admin`, `event_manager`, and `super_admin` are the three dashboard roles.
2. Campus Admin manages exactly one campus. Super Admin manages multiple campuses.
3. Campus Admin may moderate all posts within assigned campus.
4. Event Manager owns event operations only. Campus Admin owns campus moderation and Event Manager staffing.
5. Admin web deploys on Vercel.
6. MFA is deferred for the first prototype; add step-up later without changing role policy contracts.
7. First delivery is mock-data design. Backend/API integration starts only after design review.

Implementation sequence: mock shell and screens, design review, API contracts, role/RLS migration, Supabase integration, then permission and E2E tests.
