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

## Authenticated cloud smoke checks

After the cloud migrations are applied, run the read-only student-boundary checks with two dedicated pilot test users. Pass access tokens only through the shell environment; do not put them in `.env`, Git, or the mobile bundle.

```powershell
$env:CAMPUSSPHERE_SUPABASE_URL = $env:SUPABASE_URL
$env:CAMPUSSPHERE_SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$env:CAMPUSSPHERE_TEST_ACCESS_TOKEN = "<student-a-access-token>"
$env:CAMPUSSPHERE_TEST_ACCESS_TOKEN_2 = "<student-b-access-token>"
pnpm smoke:cloud
```

The runner verifies authenticated identity/profile reads, published event discovery, feed, Team Finder, notifications, chat membership visibility, and that a student event-authoring request is rejected. It does not create or mutate test data.

To obtain test access tokens without adding credentials to the repository, sign in two dedicated pilot accounts in the mobile app, inspect the active Supabase session in the development console, and pass the tokens only in the current PowerShell session. Do not use a service-role token for this runner: it is specifically testing student RLS.

Alternatively, request a fresh OTP and print a temporary student token locally:

```powershell
$env:CAMPUSSPHERE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:CAMPUSSPHERE_SUPABASE_ANON_KEY = "<anon-key>"
pnpm get:test-token student-a@example.edu
```

Enter the emailed OTP when prompted, then copy the displayed PowerShell assignment into the same terminal. Repeat with a second dedicated student account for cross-user checks. The access token is a short-lived JWT and must never be committed, placed in `.env`, or shipped in the app.

## Reminder processor

Migration `0008_notification_outbox.sql` exposes a service-role-only RPC that atomically converts due reminders into in-app notifications and provider-neutral delivery entries. Run it manually during verification:

```powershell
$env:CAMPUSSPHERE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
pnpm process:reminders 100
```

This command does not send email or push notifications. Never place the service-role key in the mobile app, public environment variables, logs, or Git. Scheduling and provider delivery remain separate release tasks.

Copy `.env.example` to `.env` for local development. Real values must stay outside Git. The service-role key is backend-only and must never be shipped in the mobile app.

## Full cloud verification

Run read-only smoke first. For dedicated test accounts only, run mutation coverage after setting an explicit safety flag:

```powershell
$env:CAMPUSSPHERE_ALLOW_TEST_MUTATIONS = "1"
$env:CAMPUSSPHERE_TEST_EVENT_ID = "<published-test-event-id>"
pnpm verify:cloud
```

The runner covers posts, polls, comments, reactions, bookmarks, Team Finder applications and team chat, message idempotency/edit/delete/read/reactions/mute, private chat attachment upload/signing, follows, blocks, and optional event registration/reminder/bookmark lifecycle. It cancels or soft-deletes temporary rows where supported.

Run read-only load checks only against non-production:

```powershell
$env:CAMPUSSPHERE_LOAD_TEST_ACK = "staging-only"
pnpm load:cloud 100 10
```

See `docs/mvp_external_verification.md` for owner-run Realtime, provider, device, backup, and pilot checks.

## Supabase Auth email through custom SMTP

Mobile does not contain SMTP credentials. Initial verification and resend both call Supabase Auth `POST /otp`; Supabase delivers the message through its configured custom SMTP provider.

Configure in the Supabase Dashboard:

1. Disable or delete **Authentication > Auth Hooks > Send Email**. A send-email hook replaces SMTP and email templates.
2. Open **Authentication > Emails** (SMTP settings) and enable custom SMTP.
3. Enter provider host, port (normally `587` with STARTTLS), username, password or app password, sender email, and sender name (`CampusSphere`).
4. Save settings and send a fresh OTP. Never put SMTP credentials in this repository or in the mobile app.

For Gmail testing, use `smtp.gmail.com`, port `587`, the full Gmail address, and a Google App Password (2-Step Verification required). Use a verified transactional SMTP provider for production scale.

Set the **Magic Link** template to show the numeric token:

```html
<h2>CampusSphere verification code</h2>
<p>Enter this code in CampusSphere:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700;">{{ .Token }}</p>
<p>This code expires soon. If you did not request it, ignore this email.</p>
```

Set subject to `CampusSphere verification code`. Remove every `{{ .ConfirmationURL }}` reference. No mobile rebuild or database migration is required after changing SMTP; request a new code to test delivery.

## Indian college and university catalogue

Migration `0016_indian_campus_catalog.sql` adds searchable institution metadata and the mobile-safe `search_campuses_mobile` RPC. The backend sync merges and deduplicates records from:

- `https://colleges-api.onrender.com/`
- `https://indian-colleges-list.vercel.app/api/institutions`

Apply the migration, then run the import with backend-only service-role credentials:

```powershell
$env:CAMPUSSPHERE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
pnpm sync:universities
```

Never put the service-role key in mobile or Git. Sync is idempotent and does not deactivate existing campuses when an upstream API is temporarily unavailable. Validate normalization without network/cloud writes using `pnpm check:university-sync`.

## Implemented backend scope

- Migrations `0001`–`0012` are cloud-applied (owner-confirmed).
- Migration `0013` adds transactional mobile profile, Team Finder, post/poll, social, notification/device, reminder, and chat preference mutations. Migrations `0014`–`0015` normalize legacy cloud `public.users` display-name and account-status constraints. Migration `0016` adds the Indian institution catalogue. Migration `0017` adds student study-resource upload/download/bookmark flows. Apply pending migrations before full cloud verification.
- Student social, independent Team Finder, relationships, notifications, safety, consented analytics, and CampusSphere-owned chat are backend-owned.
- Mobile profile/onboarding RPCs are in `0006_mobile_profile_rpc.sql`.
- `E:\projects\ChitChat` is read-only reference material only. No ChitChat files, tables, project, or database are edited, imported, renamed, or reused.
- The prototype no longer contains a mock API, mock session, or mock data fallback. Supported MVP calls use CampusSphere Supabase Auth/PostgREST/RPC/Realtime/Storage. Non-MVP surfaces must remain disabled until their schema is approved.
- Migration `0031_admin_control_plane.sql` adds the separate admin console authorization model, invitations, event ownership, workspace settings, and service-role moderation bridge. Runtime admin HTTP code lives in `admin-backend`; this directory remains the canonical database migration owner.

Validate locally before every cloud push:

```powershell
pnpm check:config
pnpm check:sql
pnpm check:contract
Get-ChildItem scripts\*.mjs | ForEach-Object { node --check $_.FullName }
```

After migrations `0013`–`0015` are applied, run `pnpm health:cloud`, obtain two student tokens with `pnpm get:test-token`, then run `pnpm smoke:cloud` and `pnpm verify:cloud`. Run domain/reminder/notification workers only with backend service-role credentials.

For local-only rehearsal, Docker and the Supabase CLI are still optional:

```powershell
supabase db reset
```
