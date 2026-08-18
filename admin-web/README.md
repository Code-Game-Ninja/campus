# CampusSphere Admin Web

The dashboard is connected to the separate `admin-backend` service and the shared CampusSphere Supabase project.

Start `admin-backend` on port `4180`, then run:

```powershell
npm run dev
```

Set `VITE_ADMIN_API_URL` when the API is not available at `http://localhost:4180`. Production builds default to the current browser origin, which allows the Render Blueprint to serve the dashboard and API from the same URL. Authentication uses the existing Supabase email OTP configuration. Roles and campus scope come from `admin_assignments`; they cannot be selected in the browser.

## Render deployment

The repository root `render.yaml` builds this dashboard and starts `admin-backend` as one Render Web Service. In Render, choose **New > Blueprint**, connect the repository, enter the prompted Supabase keys, and deploy.

## Run

```powershell
pnpm install
pnpm --filter @campussphere/admin-web dev
```

Open `http://localhost:4174`. Live data and mutations are provided by `admin-backend`; the service-role credential remains server-side.
