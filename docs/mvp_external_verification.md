# CampusSphere MVP External Verification

Code implementation is complete locally. These checks require CampusSphere cloud credentials, provider accounts, or physical devices and are owner-run release gates.

## 1. Deploy latest schema

```powershell
cd E:\projects\campus\backend
supabase db lint
supabase db push
```

Confirm migration `0013_mobile_transactional_mutations.sql` appears in remote migration history.

## 2. Obtain dedicated student tokens

```powershell
$env:CAMPUSSPHERE_SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:CAMPUSSPHERE_SUPABASE_ANON_KEY = "<anon-key>"
pnpm get:test-token student-a@example.edu
pnpm get:test-token student-b@example.edu
```

Keep tokens only in current shell. Never use service-role token for student RLS tests.

## 3. Health, RLS, and transactional flows

```powershell
pnpm health:cloud
pnpm smoke:cloud
$env:CAMPUSSPHERE_ALLOW_TEST_MUTATIONS = "1"
$env:CAMPUSSPHERE_TEST_EVENT_ID = "<published-test-event-id>"
pnpm verify:cloud
```

Expected: every check prints `PASS`; student event authoring and moderator access remain denied.

## 4. Realtime and concurrency

- Open same team conversation on two devices. Send 20 messages from both accounts.
- Confirm no duplicates, stable order after reconnect, unread/read reconciliation, typing/presence cleanup, edits/deletes, reactions, and signed attachment access.
- Fill a capacity-limited test event and Team Finder request with concurrent clients. Confirm capacity is never exceeded and duplicate requests stay idempotent.
- Block one account. Confirm profile discovery, follow/connection, direct chat, Team Finder application, and private content access follow server rules.

## 5. Staging load test

Never run against production.

```powershell
$env:CAMPUSSPHERE_LOAD_TEST_ACK = "staging-only"
pnpm load:cloud 100 10
```

Record p50, p95, p99, failures, project size, date, and any index changes. Target p95 is 200 ms where realistic; chat delivery target is 500 ms.

## 6. Providers and scheduled jobs

- Choose/configure email provider and verify OTP plus notification templates.
- Configure Expo push credentials only if push remains approved.
- Configure scheduler for reminder, domain-job, notification, retention, and account-deletion workers.
- Configure media scanning/processing for post and chat uploads.
- Configure monitoring/alerts without logging JWTs, OTPs, message bodies, or service-role keys.
- Verify quiet hours, opt-out, retry, deduplication, and failed-delivery recovery.

## 7. Devices and closed pilot

- Android 14+: auth, onboarding, events, feed, Team Finder, chat, notifications, search, safety, settings, account export/deletion.
- iOS 17+: same journey where device is available.
- Confirm organizer routes/dashboard/event authoring are unreachable on mobile.
- Test offline read of previously loaded data and clean recovery after reconnect.
- Run backup/restore rehearsal and forced-failure alert test.
- Record product-owner approval before closed pilot.
