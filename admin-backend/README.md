# CampusSphere Admin Backend

Separate Node 22 service for `admin-web`. It uses the same Supabase Auth, Postgres, REST, RPC, and notification tables as the mobile prototype while keeping the service-role credential outside browser bundles.

## Setup

The service reads configuration in this order: `prototype/.env`, `backend/.env`, then `admin-backend/.env`. Values in the later file override earlier files. For production, provide environment variables directly.

Required values:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_API_PORT=4180
ADMIN_ALLOWED_ORIGIN=http://localhost:4174
```

Apply `backend/supabase/migrations/0031_admin_control_plane.sql` to the existing linked Supabase project before signing in. The migration is additive and leaves mobile tables and RPCs intact.

Grant the first admin before or after their first sign-in:

```powershell
npm run grant:admin -- admin@example.edu super_admin
```

If the email has not used Supabase Auth yet, the command creates a pending admin invitation. The first successful OTP sign-in creates the shared user record, activates it, and claims the assignment automatically.

For campus roles, include the campus UUID:

```powershell
npm run grant:admin -- manager@example.edu event_manager <campus-id>
```

Run locally:

```powershell
npm run check
npm test
npm run dev
```

The process health endpoint is `GET http://localhost:4180/healthz`. Dependency readiness is `GET http://localhost:4180/readyz`; it returns `503 SUPABASE_UNAVAILABLE` when the configured project cannot be reached. Protected routes use a Supabase access token in the `Authorization: Bearer` header.

## Migration rollback

Rollback is intentionally manual because it removes admin assignments. After exporting any needed audit context, drop `admin_apply_moderation_action_as`, then `event_admin_owners`, `admin_invitations`, `admin_workspace_settings`, and `admin_assignments`. No mobile-owned table needs to be modified.
