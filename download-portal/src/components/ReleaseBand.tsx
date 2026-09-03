import { AndroidLogo, GithubLogo } from '@phosphor-icons/react';
import { formatDownloads, REPO_URL } from '@/lib/release';
import type { ReleaseState } from '@/hooks/useLatestRelease';

interface ReleaseBandProps {
  state: ReleaseState;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function FactSkeleton({ label }: { label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-2 h-4 w-20 animate-pulse rounded-[4px] bg-line" />
    </div>
  );
}

/**
 * Release facts read from the GitHub API at runtime. Nothing here is invented:
 * if a value is missing from the API response it is not rendered.
 */
export function ReleaseBand({ state }: ReleaseBandProps) {
  const { release } = state;
  const loading = state.status === 'loading';

  return (
    <div className="border-y border-line bg-sunken">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-field bg-brand-soft text-brand-deep">
              <AndroidLogo size={22} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Android build</p>
              <p className="text-xs text-muted">
                {state.status === 'fallback'
                  ? 'Live release data is unavailable right now'
                  : 'Published to GitHub Releases'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 sm:gap-x-10">
            {loading ? (
              <>
                <FactSkeleton label="Version" />
                <FactSkeleton label="Size" />
                <FactSkeleton label="Published" />
              </>
            ) : (
              <>
                <Fact label="Version" value={release.version} />
                {release.size ? <Fact label="Size" value={release.size} /> : null}
                {release.publishedAt ? <Fact label="Published" value={release.publishedAt} /> : null}
                {release.downloads !== null && release.downloads > 0 ? (
                  <Fact label="Downloads" value={formatDownloads(release.downloads)} />
                ) : null}
              </>
            )}

            <a
              href={`${REPO_URL}/releases`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep transition-colors hover:text-brand"
            >
              <GithubLogo size={17} aria-hidden />
              All releases
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
