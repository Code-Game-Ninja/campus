# CampusSphere Backend

This directory is the local Supabase-first backend workspace for the mobile MVP.

The project uses an existing cloud Supabase project. This repository does not create a Supabase project, hosted database, email provider, push provider, or deployment service.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase CLI authenticated to the existing cloud project

Enable pnpm with Corepack:

```powershell
corepack enable
corepack prepare pnpm@10.15.0 --activate
```

Install dependencies and validate the scaffold:

```powershell
pnpm install
pnpm check:config
pnpm check:sql
pnpm typecheck
```

Link the existing cloud project using a project reference held outside Git:

```powershell
$env:SUPABASE_PROJECT_REF = "your-existing-project-ref"
pnpm supabase:link
pnpm db:lint
pnpm db:push
```

Copy `.env.example` to `.env` for local development. Real values must stay outside Git. The service-role key is backend-only and must never be shipped in the mobile app.

## Planned next steps

- P2.2: SQL migrations, RLS policies, and deterministic seed workflow.
- P2.3: Identity, campus, profile, privacy, discoverability, and consent schema.
- P2.4: Student-facing event schema and attendee participation functions.
- P2.5: Student social, independent Team Finder, relationships, notifications, safety, consented analytics, and CampusSphere-owned chat schema are prepared in migrations `0004_social_team_safety.sql` and `0005_chat_realtime.sql`.
- Mobile profile/onboarding RPCs are in `0006_mobile_profile_rpc.sql`.
- `E:\projects\ChitChat` is read-only reference material only. No ChitChat files, tables, project, or database are edited, imported, renamed, or reused.
- The prototype no longer contains a mock API, mock session, or mock data fallback. Supported MVP calls use CampusSphere Supabase Auth/PostgREST/RPC/Realtime/Storage. Non-MVP surfaces must remain disabled until their schema is approved.

For local-only rehearsal, Docker and the Supabase CLI are still optional:

```powershell
supabase db reset
```
