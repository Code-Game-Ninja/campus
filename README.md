# CampusSphere

CampusSphere uses Supabase Cloud for its shared database, authentication, and storage. The admin product is split into a protected Node.js API and a static React dashboard:

```text
Render Web Service (admin-web + admin-backend)
                    |
                    v
Supabase Cloud (Auth, Postgres, Storage)
```

This setup can run on free tiers for development and low traffic. Free plans can sleep, pause, change limits, or restrict usage, so review each provider's current limits before production use.

## Repository layout

```text
admin-web/       React and Vite admin dashboard
admin-backend/   Node.js admin API and role enforcement
backend/         Supabase migrations, checks, and background jobs
prototype/       Expo mobile application
```

The browser never receives the Supabase service-role key. All privileged database access goes through `admin-backend`.

## Recommended free deployment

| Component | Provider |
| --- | --- |
| Database, Auth, Storage | Supabase Cloud Free |
| Admin API and dashboard | Render Free Web Service |
| Optional separate dashboard host | Cloudflare Pages Free |
| Optional scheduled jobs | GitHub Actions |

For the shortest setup, use the included Render Blueprint. It deploys both `admin-web` and `admin-backend` as one free Render Web Service, so no separate frontend host or CORS setup is required. In Render, choose **New > Blueprint**, connect this repository, and apply `render.yaml`. Render will prompt for `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

## Prerequisites

- Node.js 22 or newer
- npm and npx
- A GitHub repository containing this project
- An existing Supabase Cloud project
- A Render account
- A Cloudflare account only when using the optional separate frontend deployment

The configured Supabase project reference for this workspace is:

```text
grcvstojrtaafpwtzojf
```

Do not commit `.env` files or the Supabase service-role key.

## 1. Apply migrations to Supabase Cloud

From PowerShell:

```powershell
cd E:\projects\campus\backend

npx supabase@latest login
npx supabase@latest link --project-ref grcvstojrtaafpwtzojf
npx supabase@latest migration list
npx supabase@latest db push
```

`db push` applies all migrations that are not yet recorded on the linked project. Review `migration list` before confirming changes to an existing live database.

The admin service requires:

```text
backend/supabase/migrations/0031_admin_control_plane.sql
```

Verify the admin tables from the Supabase SQL Editor:

```sql
select to_regclass('public.admin_assignments');
select to_regclass('public.admin_invitations');
select to_regclass('public.event_admin_owners');
select to_regclass('public.admin_workspace_settings');
```

Each query should return its table name rather than `null`.

## 2. Collect Supabase credentials

Open Supabase Dashboard, select the project, and open Project Settings > API.

The backend requires:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Use the project URL, the anon or publishable key, and the service-role secret key. The service-role key must only be stored in the backend hosting provider's secret environment variables.

## 3. Deploy admin-backend to Render

### One-click Blueprint (recommended)

The repository root contains `render.yaml`. Choose **New > Blueprint** in Render and select this repository. The Blueprint builds the React dashboard, runs backend checks and tests, starts the Node API, and serves both applications from one URL. Enter the Supabase anon key and service-role key when Render prompts for them.

After deployment, use the Render URL for both the dashboard and API:

```text
https://campussphere-admin.onrender.com
https://campussphere-admin.onrender.com/healthz
https://campussphere-admin.onrender.com/readyz
```

### Separate services (optional)

Skip the remaining manual Render and Cloudflare configuration when using the Blueprint. The following settings are only for teams that want the API and dashboard on separate hosts.

Create a Render Web Service connected to the GitHub repository.

Use these settings:

```text
Root Directory: admin-backend
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /healthz
```

Add these environment variables in Render:

```text
SUPABASE_URL=https://grcvstojrtaafpwtzojf.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ADMIN_API_PORT=10000
ADMIN_ALLOWED_ORIGIN=https://<your-cloudflare-pages-domain>
NODE_ENV=production
```

Use a temporary value for `ADMIN_ALLOWED_ORIGIN` until Cloudflare Pages provides the final dashboard URL. Do not include a trailing slash in the origin.

Render should produce a URL similar to:

```text
https://campussphere-admin-api.onrender.com
```

Verify the deployment:

```powershell
Invoke-RestMethod https://campussphere-admin-api.onrender.com/healthz
Invoke-RestMethod https://campussphere-admin-api.onrender.com/readyz
```

`healthz` confirms that Node is running. `readyz` confirms that the backend can reach Supabase with the configured credentials.

## 4. Optional: deploy admin-web to Cloudflare Pages

Create a Cloudflare Pages project connected to the same GitHub repository.

Use these settings:

```text
Root Directory: admin-web
Build Command: npm ci && npm run build
Output Directory: dist
```

Add this build environment variable:

```text
VITE_ADMIN_API_URL=https://campussphere-admin-api.onrender.com
```

Replace the example with the real Render service URL. Vite embeds this value at build time, so redeploy the site after changing it.

Cloudflare Pages should produce a URL similar to:

```text
https://campussphere-admin.pages.dev
```

Return to Render and set the exact frontend origin:

```text
ADMIN_ALLOWED_ORIGIN=https://campussphere-admin.pages.dev
```

Redeploy the Render service after changing the origin.

## 5. Configure Supabase email authentication

In Supabase Dashboard:

1. Open Authentication > Providers.
2. Ensure the Email provider is enabled.
3. Ensure email OTP sign-in is enabled.
4. Review Authentication > Rate Limits.
5. Add the deployed dashboard URL under Authentication > URL Configuration when required.
6. Configure a custom SMTP provider before relying on OTP for production users.

Supabase's default email service is intended for development and may have strict delivery and rate limits.

## 6. Grant the first administrator

For local administration, create `admin-backend/.env` with live Supabase credentials:

```text
SUPABASE_URL=https://grcvstojrtaafpwtzojf.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ADMIN_API_PORT=4180
ADMIN_ALLOWED_ORIGIN=http://localhost:4174
```

The file is ignored by Git. Then run:

```powershell
cd E:\projects\campus\admin-backend
npm install
npm run grant:admin -- fakemaster1230@gmail.com super_admin
```

For campus-scoped roles, provide the campus UUID:

```powershell
npm run grant:admin -- manager@example.edu campus_admin <campus-id>
npm run grant:admin -- manager@example.edu event_manager <campus-id>
```

If the email has never signed in, the command creates a pending invitation. The first successful OTP sign-in creates and activates the shared user record and claims the admin assignment.

## 7. Verify the complete live flow

1. Open the Cloudflare Pages dashboard URL.
2. Enter the granted administrator email.
3. Request the six-digit Supabase OTP.
4. Enter the OTP.
5. Confirm that the dashboard loads live metrics.
6. Open Posts, Events, Staff, Campuses, Notifications, and Audit Log.
7. Confirm that role and campus restrictions match the assigned role.

Useful API checks:

```powershell
Invoke-RestMethod https://campussphere-admin-api.onrender.com/healthz
Invoke-RestMethod https://campussphere-admin-api.onrender.com/readyz
```

## Local development

Start the backend from a normal terminal with unrestricted internet access:

```powershell
cd E:\projects\campus\admin-backend
npm install
npm run dev
```

Start the dashboard in another terminal:

```powershell
cd E:\projects\campus\admin-web
npm ci
npm run dev
```

Open:

```text
http://localhost:4174
```

Local endpoints:

```text
http://localhost:4180/healthz
http://localhost:4180/readyz
```

## Optional background jobs

The `backend` package contains one-shot jobs rather than a persistent web server:

```powershell
cd E:\projects\campus\backend
npm run process:notifications
npm run process:reminders
npm run process:domain-jobs
```

Run these with GitHub Actions scheduled workflows if the live product requires them. Store Supabase credentials in GitHub Actions Secrets. Do not deploy `backend` as a Render Web Service unless a dedicated HTTP server entrypoint is added.

## Troubleshooting

### `503 SUPABASE_UNAVAILABLE`

The admin API is running but cannot reach Supabase. Check:

- `SUPABASE_URL` is correct and has no trailing slash.
- The anon and service-role keys belong to the same project.
- The host allows outbound HTTPS connections on port 443.
- The Supabase project is active and not paused.
- `/readyz` can reach the Supabase REST API.

### Browser CORS error

Set Render's `ADMIN_ALLOWED_ORIGIN` to the exact Cloudflare Pages origin:

```text
https://campussphere-admin.pages.dev
```

Do not add a path or trailing slash. Redeploy the backend after changing it.

### Frontend still calls localhost

Set this in Cloudflare Pages and rebuild:

```text
VITE_ADMIN_API_URL=https://campussphere-admin-api.onrender.com
```

### `ADMIN_ACCESS_REQUIRED`

Grant or invite the email again:

```powershell
cd E:\projects\campus\admin-backend
npm run grant:admin -- user@example.edu super_admin
```

Then sign out and complete OTP sign-in again.

### OTP email does not arrive

- Check Supabase Authentication logs.
- Check spam and junk folders.
- Review email rate limits.
- Configure custom SMTP.
- Confirm the Email provider is enabled.

## Security checklist

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Never prefix the service-role key with `VITE_` or `EXPO_PUBLIC_`.
- Keep `.env` files out of Git.
- Restrict `ADMIN_ALLOWED_ORIGIN` to the deployed dashboard.
- Use separate staging and production Supabase projects when possible.
- Rotate any credential that has appeared in a commit, screenshot, log, or public message.
- Review Supabase Auth, API, and database logs after deployment.
- Test campus boundaries with non-super-admin accounts.

## Free-tier limitations

- Render Free services may sleep after inactivity and have slow cold starts.
- Supabase Free projects have database, storage, bandwidth, and email limits.
- Cloudflare Pages is appropriate for the static dashboard but does not run this Node backend.
- GitHub Actions free usage depends on repository visibility and account limits.
- Free-tier policies can change; verify current provider terms before launch.
