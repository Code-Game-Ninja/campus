# CampusSphere main app

Expo React Native client for CampusSphere. Product name is **CampusSphere main app**. Repository path remains `apps/prototype` temporarily to avoid a high-risk workspace move while active branches and deployment scripts still reference it.

## Run

```powershell
cd E:\projects\CampusSphere
corepack pnpm --filter @campussphere/app start
```

The prototype currently runs entirely against a stateful in-memory mock backend. OTP accepts any code, data mutations persist for the current app session, and no API or Firebase credentials are required.

## Runtime

- Mock auth sessions are stored with Expo Secure Store.
- The in-memory mock API supplies prototype data and mutation responses.
- React Query owns remote cache and mutation invalidation.
- Mock upload intents exercise the complete upload flow without cloud storage.
- Android Firebase configuration remains optional unless `GOOGLE_SERVICES_JSON` is supplied for a real build.

See `docs/09-delivery/free-hosting-and-deployment-guide.md` and `docs/09-delivery/main-app-production-readiness-report.md`.
