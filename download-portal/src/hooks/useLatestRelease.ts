import { useEffect, useState } from 'react';
import { FALLBACK_RELEASE, fetchLatestRelease, type ReleaseInfo } from '@/lib/release';

export type ReleaseState =
  | { status: 'loading'; release: ReleaseInfo }
  | { status: 'ready'; release: ReleaseInfo }
  | { status: 'fallback'; release: ReleaseInfo };

/**
 * Loads the latest GitHub release once per page view. A failed or rate-limited
 * request resolves to the static fallback so the download button is never dead.
 */
export function useLatestRelease(): ReleaseState {
  const [state, setState] = useState<ReleaseState>({
    status: 'loading',
    release: FALLBACK_RELEASE,
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchLatestRelease(controller.signal)
      .then((release) => {
        if (active) setState({ status: 'ready', release });
      })
      .catch(() => {
        if (active) setState({ status: 'fallback', release: FALLBACK_RELEASE });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
