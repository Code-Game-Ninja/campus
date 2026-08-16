# CampusSphere Admin Web

The dashboard is connected to the separate `admin-backend` service and the shared CampusSphere Supabase project.

Start `admin-backend` on port `4180`, then run:

```powershell
npm run dev
```

Set `VITE_ADMIN_API_URL` when the API is not available at `http://localhost:4180`. Authentication uses the existing Supabase email OTP configuration. Roles and campus scope come from `admin_assignments`; they cannot be selected in the browser.

Design-first mock dashboard for Campus Admin, Event Manager, and Super Admin roles.

## Run

```powershell
pnpm install
pnpm --filter @campussphere/admin-web dev
```

Open `http://localhost:4174`. Use the **Preview role** selector to inspect each dashboard.

## Current boundary

- All visible data is local mock data.
- Role navigation and capabilities demonstrate the intended permission model only.
- No Supabase admin API, service-role key, staff assignment, or database mutation is connected.
- Backend integration starts after design and flow approval.
