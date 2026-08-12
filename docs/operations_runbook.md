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

### Indian institution catalogue

After applying `0016_indian_campus_catalog.sql`, populate `public.campuses` from the two approved open APIs:

```powershell
$env:CAMPUSSPHERE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:CAMPUSSPHERE_SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
pnpm sync:universities
```

The sync merges duplicate names/locations, upserts in batches, and keeps existing records if one provider is unavailable. Service-role credentials remain backend-only. Run `pnpm check:university-sync` for a write-free fixture check.

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

### Custom SMTP delivery

Disable or delete **Authentication > Auth Hooks > Send Email** before enabling SMTP; an email hook replaces SMTP and templates. In **Authentication > Emails**, enable custom SMTP and enter provider host, port (normally `587`), username, password or app password, sender email, and sender name (`CampusSphere`). Keep credentials in Supabase settings only.

For Gmail testing: `smtp.gmail.com`, port `587`, full Gmail username, and Google App Password with 2-Step Verification. Use verified transactional SMTP for production.

Use `{{ .Token }}` in the **Magic Link** template for the six-digit code and remove `{{ .ConfirmationURL }}`. Mobile initial-send and resend already call Supabase Auth `/otp`; no app code or database migration changes are needed. Request a fresh code after saving SMTP settings.

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
