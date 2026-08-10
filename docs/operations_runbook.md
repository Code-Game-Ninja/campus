# CampusSphere Operations Runbook

## Migration

```powershell
cd E:\projects\campus\backend
$env:SUPABASE_PROJECT_REF = "<project-ref>"
$env:SUPABASE_DB_PASSWORD = "<database-password>"
supabase db lint
supabase db push
```

Never edit an applied migration. Add a higher-numbered migration.

## Supabase email OTP (not magic link)

CampusSphere mobile already requests and verifies numeric email OTPs through Auth (`type: email`). Supabase email templates decide whether the message displays a link or code.

Open [CampusSphere Auth email templates](https://supabase.com/dashboard/project/grcvstojrtaafpwtzojf/auth/templates), choose **Magic Link**, and replace link markup with the OTP token:

```html
<h2>CampusSphere verification code</h2>
<p>Enter this code in CampusSphere:</p>
<p style="font-size: 32px; letter-spacing: 8px; font-weight: 700;">{{ .Token }}</p>
<p>This code expires soon. If you did not request it, ignore this email.</p>
```

Set subject to `CampusSphere verification code`. Do not include `{{ .ConfirmationURL }}`. Save template, then request a fresh code; old emails remain links.

## Jobs

Use backend-only service-role credentials. Never put them in mobile/public variables.

```powershell
pnpm process:reminders 100
node scripts/process-domain-jobs.mjs 100
node scripts/process-notifications.mjs 50
```

Jobs are idempotent. Retry failed delivery through outbox claim/complete RPCs. Do not run production load tests.

## Release verification

Use two dedicated student accounts. Run `pnpm smoke:cloud` before `pnpm verify:cloud`. Mutation verification requires `CAMPUSSPHERE_ALLOW_TEST_MUTATIONS=1` and must not use real student accounts. Load testing requires `CAMPUSSPHERE_LOAD_TEST_ACK=staging-only` and must never target production.

Full owner-run checklist: `docs/mvp_external_verification.md`.

## Safety

Reports enter `public.reports`; moderator action uses `apply_moderation_action`. Actions write `moderation_actions` and `audit_logs`. Student clients cannot read moderator tables.

Assign or revoke staff roles only through a backend/service-role administration process. Never expose `staff_roles` writes to mobile clients. Moderator reads use `list_moderation_queue` and `list_moderation_audit`; every action still uses `apply_moderation_action` and creates audit rows.

## Account lifecycle

Student deletion immediately disables account visibility and queues 30-day cleanup. Student may cancel during grace period. Service role claims/purges jobs only after grace period.

## Incident response

1. Disable affected job/provider.
2. Preserve audit/report/outbox rows.
3. Inspect Supabase logs and migration status.
4. Add forward-only fix migration.
5. Re-run smoke/RLS tests with dedicated students.
6. Record incident, owner, timestamp, impact, and rollback.
