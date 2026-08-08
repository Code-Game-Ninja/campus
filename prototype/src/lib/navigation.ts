import { router, type Href } from 'expo-router';

const UNDER_CONSTRUCTION_ROUTES: ReadonlyArray<{ prefix: string; feature: string; exact?: boolean }> = [
  { prefix: '/assistant', feature: 'Campus Assistant' },
  { prefix: '/discover/events', feature: 'Events' },
  { prefix: '/discover/clubs', feature: 'Clubs' },
  { prefix: '/discover/listings', feature: 'Marketplace and Lost & Found' },
  { prefix: '/discover/opportunities', feature: 'Opportunities' },
  { prefix: '/organizer', feature: 'Organizer tools' },
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

export function goBackOrReplace(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
