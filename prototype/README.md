# CampusSphere Mobile App

Expo React Native app for CampusSphere. The app runs on Android, iOS, and web, and connects directly to the live CampusSphere Supabase project. The Render admin backend is a separate service and is not required by the mobile app.

## Requirements

- Node.js 22
- npm
- An Expo account for EAS cloud builds
- Android Studio and an emulator, or an Android device for local testing
- macOS with Xcode for local iOS builds; EAS can build iOS in the cloud

## Configure Supabase

Create the local environment file:

```powershell
cd E:\projects\campus\prototype
Copy-Item .env.example .env
```

Set only public client values in `prototype/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`EXPO_PUBLIC_API_URL` is optional. The current mobile client uses Supabase REST and RPC endpoints directly, so leave it empty unless the app code explicitly adds a separate API route.

Never put a Supabase service-role key, database password, JWT secret, or other server secret in this file or in an EAS environment used by the mobile bundle. Values with the `EXPO_PUBLIC_` prefix are compiled into the application and are public.

Before testing a new Supabase project, apply the migrations from `backend/supabase/migrations` and configure Supabase Auth email OTP. Storage buckets and policies used by posts, chat attachments, and study resources are also defined by the backend migrations.

## Install And Run Locally

```powershell
cd E:\projects\campus\prototype
npm ci
npm run typecheck
npm start
```

Then scan the QR code with Expo Go, or use one of these commands:

```powershell
npm run android
npm run ios
npm run web
```

Use `npm run start:tunnel` when the phone and computer are on different networks. Use `npx expo start -c` after changing environment variables or when Metro serves stale code.

The current project is Expo SDK 54 with Expo Router. The configured Android application id is `com.campus.app`; change it to a unique permanent id in `app.json` before publishing to Google Play.

## Build An Android Preview APK

Install EAS CLI and sign in:

```powershell
npm install --global eas-cli
eas login
eas project:info
```

The repository already contains `eas.json` and an EAS project id. Configure preview environment values in the Expo dashboard or with EAS environment commands, then build:

```powershell
cd E:\projects\campus\prototype
eas env:list --environment preview
eas build --platform android --profile preview
```

The `preview` profile produces an installable APK. Download it from the EAS build page and install it on a test device. The build requires a committed working tree because `eas.json` has `requireCommit: true`.

## Publish To GitHub Releases

To publish a new version so users can download the APK directly from GitHub:

1. Download the generated APK from the EAS build URL:
   ```powershell
   curl.exe -L "YOUR_EAS_ARTIFACT_URL.apk" -o "CampusSphere-vX.Y.Z.apk"
   ```

2. Create the release with the attached APK:
   ```powershell
   gh release create v1.0.0 CampusSphere-v1.0.0.apk --title "CampusSphere Mobile App v1.0.0" --notes "Release notes..."
   ```

Users can download the latest installable APK anytime from:
`https://github.com/Code-Game-Ninja/campus/releases/latest`


## Build For Google Play

Use the production profile to create an Android App Bundle:

```powershell
cd E:\projects\campus\prototype
eas build --platform android --profile production
```

Submit the resulting `.aab` to Google Play Console, starting with Internal testing. EAS manages Android signing credentials when prompted. Do not change `android.package` after publishing the first store listing.

## Build For iOS And TestFlight

```powershell
cd E:\projects\campus\prototype
eas build --platform ios --profile production
```

EAS will request Apple Developer credentials and create the signing profile. Download the build or submit it directly:

```powershell
eas submit --platform ios --profile production
```

Local iOS builds require macOS and Xcode. Publishing to the App Store/TestFlight requires an Apple Developer account; this is not free. Android local testing is free, while Google Play and Apple distribution accounts have their own fees.

## Environment Values For EAS

Set the two public values separately for `development`, `preview`, and `production` in the Expo dashboard under Project Settings -> Environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

After changing an EAS environment value, create a new build. Environment variables are compiled into the bundle and are not updated in an already-installed app.

## Notifications

The app already includes `expo-notifications`. For Android push notifications, create a Firebase project and provide `google-services.json` only during an EAS build through the `GOOGLE_SERVICES_JSON` file secret. Never commit that file. Configure iOS push credentials through EAS when submitting to TestFlight.

## Release Checklist

1. Confirm Supabase migrations, Auth OTP, storage buckets, and RLS policies are live.
2. Confirm only the Supabase URL and anon key are in EAS public environments.
3. Run `npm ci`, `npm run typecheck`, and the app smoke test on a real device.
4. Commit all changes, because EAS requires a clean committed revision.
5. Build and install the `preview` APK first.
6. Verify sign-in, onboarding, posts, uploads, events, chat, notifications, and sign-out.
7. Build the `production` profile and submit to internal testing/TestFlight.

## Troubleshooting

- `Missing Supabase configuration`: check `prototype/.env` or the EAS environment for both public Supabase values.
- Changes to `.env` are ignored by Git and require a Metro restart or a new EAS build.
- `Network request failed` on a phone: use the live Supabase URL, confirm the device has internet access, and run `npm run start:tunnel` for local development.
- EAS refuses to build because the tree is dirty: commit the source and lockfile changes, then rerun the build.
- A mobile build does not need a separate Render deployment. Deploy Render only for the admin web/backend; the mobile app uses Supabase directly.
