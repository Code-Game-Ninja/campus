# CampusSphere Backend

This directory is the local Supabase-first backend workspace for the mobile MVP.

P2.1 is intentionally local-only. It does not create or configure a Supabase project, hosted database, email provider, push provider, or deployment service.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase CLI for local database/auth/realtime emulation

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

Start the local Supabase stack only when Docker and the Supabase CLI are available:

```powershell
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Copy `.env.example` to `.env` for local development. Real values must stay outside Git. The service-role key is backend-only and must never be shipped in the mobile app.

## Planned next steps

- P2.2: SQL migrations, RLS policies, and deterministic seed workflow.
- P2.3: Identity, campus, profile, privacy, discoverability, and consent schema.
- P2.4: Student-facing event schema and attendee participation functions.

The SQL baseline can be inspected without external credentials. Running it requires the Supabase CLI and Docker:

```powershell
supabase db reset
```
