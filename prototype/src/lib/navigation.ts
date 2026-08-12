import { router, type Href } from 'expo-router';

export type SessionRouteState = {
  sessionResolved: boolean;
  authenticated: boolean;
  onboardingRoute: 'university' | 'profile' | 'complete';
};

const UNDER_CONSTRUCTION_ROUTES: ReadonlyArray<{ prefix: string; feature: string; exact?: boolean }> = [
  { prefix: '/discover/clubs', feature: 'Clubs' },
  { prefix: '/discover/listings', feature: 'Marketplace and Lost & Found' },
  { prefix: '/discover/opportunities', feature: 'Opportunities' },
];

export function getUnderConstructionFeature(pathname: string): string | null {
  const match = UNDER_CONSTRUCTION_ROUTES.find(({ prefix, exact }) =>
    pathname === prefix || (!exact && pathname.startsWith(`${prefix}/`)),
  );
  return match?.feature ?? null;
}

export function openUnderConstruction(feature: string): void {
  router.push({ pathname: '/under-construction', params: { feature } } as never);
}

const AUTH_PATHS = new Set(['/welcome', '/verify', '/(auth)/welcome', '/(auth)/verify']);
const UNIVERSITY_PATHS = new Set(['/university', '/(onboarding)/university']);
const PROFILE_SETUP_PATHS = new Set(['/profile-setup', '/(onboarding)/profile-setup']);

export function getSessionRedirect(pathname: string, state: SessionRouteState): Href | null {
  if (!state.sessionResolved) return null;

  const isAuthPath = AUTH_PATHS.has(pathname);
  const isUniversityPath = UNIVERSITY_PATHS.has(pathname);
  const isProfileSetupPath = PROFILE_SETUP_PATHS.has(pathname);

  if (!state.authenticated) {
    return pathname === '/' || isAuthPath ? null : '/(auth)/welcome';
  }
  if (state.onboardingRoute === 'university') {
    return isUniversityPath ? null : '/(onboarding)/university';
  }
  if (state.onboardingRoute === 'profile') {
    return isProfileSetupPath ? null : '/(onboarding)/profile-setup';
  }
  if (pathname === '/' || isAuthPath || isUniversityPath || isProfileSetupPath) {
    return '/(tabs)/home';
  }
  return null;
}

export function goBackOrReplace(fallback: Href): void {
  // Auth/onboarding routes can remain in Expo Router history after a redirect.
  // Use the screen-owned destination so Back never re-enters onboarding.
  router.replace(fallback);
}
