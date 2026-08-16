# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing Vite + React + TypeScript application. Current deployment target is Vercel. Supabase Auth, PostgreSQL, RLS, protected server endpoints, Storage, Realtime, and audited RPCs are the planned production backend. Browser code must never contain a service-role key.

## Users

Primary users are authorized CampusSphere staff operating from a desktop or tablet browser:

- **Campus Admin:** owns operations for exactly one assigned campus. Creates and manages Event Manager accounts for that campus, moderates campus posts, and manages campus-level operations.
- **Event Manager:** is created and assigned by a Campus Admin. Operates event drafts, publishing, registrations, capacity, waitlists, venues, media, schedules, and attendee notifications for the assigned campus.
- **Super Admin:** operates globally across campuses. Manages campuses, Campus Admins, Event Managers, platform-wide content, moderation, catalog data, audit history, feature rollout, jobs, and health.

Additional scoped staff roles such as moderator, support, and auditor may exist in the backend. They are not separate first-release dashboard products unless explicitly approved.

## Product Purpose

CampusSphere Admin Web gives trusted staff one place to run campus operations without giving every role global access. It turns event operations, campus content, moderation, staffing, audit evidence, and platform health into clear, permission-aware workflows.

Success means each staff member can finish their assigned work quickly, understand the active campus scope at every step, and receive an explicit denial when a requested action exceeds policy. Every sensitive write must be traceable to an actor, scope, reason, request ID, and audit record.

## Positioning

CampusSphere Admin Web combines campus-aware authorization with operational clarity. Scope is resolved from trusted staff assignments, not from a client-supplied `campus_id`. Campus Admins stay inside one campus, Event Managers stay inside event operations, and only Super Admins receive global control.

## Operating Context

- Separate web application under `admin-web/`, independent from the student mobile app under `prototype/`.
- Desktop-first experience with tablet support and a deliberate mobile fallback for urgent review work.
- Vercel is the deployment target. Supabase remains the authentication, data, policy, storage, and realtime platform.
- Browser requests use the signed-in user's Supabase access token and a protected `/admin/v1` server boundary.
- Mock-data mode is the current implementation state. It is for design review only and must be visibly replaced by API loading, empty, error, and permission states before production use.
- No arbitrary SQL console, database credential display, hard delete control, or service-role credential in browser code.

## Capabilities and Constraints

### Campus Admin

- View assigned campus summary, events, posts, reports, and staff activity.
- Moderate all posts belonging to assigned campus with reason, confirmation, and audit evidence.
- Create, invite, assign, suspend, and revoke Event Manager accounts for assigned campus, subject to backend policy.
- Read event operational status and safe attendee aggregates. Event lifecycle ownership belongs to Event Manager unless an explicit capability grants otherwise.
- Cannot manage another campus, create Campus Admin or Super Admin accounts, access global health, or alter platform-wide settings.

### Event Manager

- Create and edit event drafts.
- Submit, publish, cancel, and complete events through validated lifecycle transitions.
- Manage capacity, registrations, waitlists, schedules, venues, media, and event-specific notifications.
- Preview attendee-facing event content before publishing.
- Cannot moderate general campus posts, manage staff or users, change campus scope, manage permissions, or operate platform health.

### Super Admin

- Inspect and filter all permitted campuses, content, reports, staff assignments, audit records, jobs, and health summaries.
- Create and manage campuses, Campus Admins, and Event Managers with approval, expiry, revocation, and audit history.
- Apply platform moderation and safe job retry operations.
- Change catalog and feature flags only through explicit confirmation, idempotency, and audit logging.
- Read minimum necessary sensitive data. Private messages, report evidence, attendee contact details, and account security fields require separate policy checks.

### Shared constraints

- Deny by default. Every request evaluates actor, action, resource, scope, ownership, status, and context.
- UI hiding is convenience only. Backend policy and RLS are authoritative.
- Published content uses soft lifecycle transitions. Normal admin UI never hard-deletes event, post, or user history.
- Destructive or bulk actions require reason, confirmation, exact affected scope, idempotency key, and audit event.
- MFA is deferred for the first prototype. The auth model must leave a step-up path for later Super Admin and high-risk actions.
- Current mock data is synthetic and must never be presented as production telemetry or user data.

## Brand Commitments

- Product name: **CampusSphere**.
- Admin surface name: **CampusSphere Admin Web**.
- Voice: direct, calm, specific, and operational. Labels describe the action or state. No hype, vague promises, or invented health claims.
- The student mobile app remains student-only. Organizer and admin access stays on the web.

## Evidence on Hand

- Role and permission decisions: `ADMIN_PANEL_PLAN.md`.
- Current mock dashboard: `src/App.tsx`.
- Current mock fixtures: `src/mock/data.ts`.
- Current capability map: `src/permissions.ts`.
- Current visual implementation: `src/styles.css`.
- Existing backend and mobile task boundary: `../docs/mvp_implementation_tasks.md`.

The current app has no production admin API, Supabase admin migration, staff assignment table, or authenticated admin route. Future work must not fabricate those as complete.

## Product Principles

1. **Scope is visible.** Staff should always know which campus or global context is active.
2. **Policy is explicit.** A denied action explains what is unavailable without exposing sensitive policy details.
3. **Evidence travels with action.** Sensitive changes show actor, target, reason, scope, and audit state.
4. **Operations stay focused.** Event work, campus moderation, and global governance remain separate jobs with separate navigation.
5. **Synthetic data stays honest.** Mock fixtures are labeled and never stand in for live health, attendance, or user claims.

## Accessibility & Inclusion

- Target WCAG 2.2 AA for text, controls, focus states, keyboard operation, and status communication.
- Every action must work by keyboard and expose a visible focus ring.
- Color never carries state alone. Status uses text plus color and, where useful, an icon.
- Tables provide semantic headers, row actions with accessible names, and mobile overflow that preserves column meaning.
- Motion is limited to hierarchy, feedback, and state transition. `prefers-reduced-motion: reduce` removes non-essential movement.
- Responsive fallback supports tablet widths and a narrow urgent-review layout without hiding critical permission or status information.
