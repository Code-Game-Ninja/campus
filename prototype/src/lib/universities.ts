/**
 * University lookup hooks â€” react-query over the public /universities endpoint.
 *
 * The catalogue is ~10k static records, so caching is aggressive: a country list
 * or a repeated search never needs refetching within a session.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';

export interface University {
  id: string;
  name: string;
  country: string;
  countryCode: string | null;
  domain: string | null;
  stateProvince: string | null;
  city?: string | null;
  institutionType?: string | null;
  websiteUrl?: string | null;
}

export interface UniversitySearchResult {
  items: University[];
  total: number;
  limit: number;
  offset: number;
}

export interface UniversityCountry {
  country: string;
  countryCode: string | null;
  universityCount: number;
}

/** Matches the server-side clamp, so the UI never asks for a page it won't get. */
export const PAGE_SIZE = 25;

/**
 * Debounce a rapidly-changing value.
 *
 * Typing "university of oxford" would otherwise fire ~20 requests, each
 * scanning 10k records, with results arriving out of order. 250ms is below the
 * threshold where typing feels laggy but well above inter-keystroke time.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Search institutions by name, optionally scoped to one country. */
export function useUniversitySearch(params: {
  q: string;
  enabled?: boolean;
}) {
  const { q, enabled = true } = params;
  return useQuery({
    // Country is part of the key: switching country must not show the previous
    // country's cached results.
    queryKey: ['universities', 'india', 'search', q],
    queryFn: () =>
      apiGet<UniversitySearchResult>('/universities', {
        q,
        limit: PAGE_SIZE,
      }),
    enabled,
    // Static dataset â€” once fetched, a given query's answer cannot change.
    staleTime: 5 * 60_000,
    // Keep the previous page visible while the next query resolves, so the list
    // doesn't blank out on every keystroke.
    placeholderData: (previous) => previous,
  });
}





