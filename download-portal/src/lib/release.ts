const REPO = import.meta.env.VITE_GITHUB_REPO ?? 'Code-Game-Ninja/campus';

export const RELEASES_URL =
  import.meta.env.VITE_RELEASES_URL ?? `https://github.com/${REPO}/releases/latest`;

export const REPO_URL = `https://github.com/${REPO}`;

export interface ReleaseInfo {
  /** Version without a leading "v", e.g. "1.0.0". */
  version: string;
  /** Direct APK link, or the releases page when no .apk asset was found. */
  downloadUrl: string;
  /** Formatted asset size, e.g. "48.2 MB". Null when unknown. */
  size: string | null;
  /** Formatted publish date, e.g. "2 Sep 2026". Null when unknown. */
  publishedAt: string | null;
  /** Total downloads counted across every APK asset in the release. */
  downloads: number | null;
  /** True when the numbers came from the live API rather than the fallback. */
  live: boolean;
}

export const FALLBACK_RELEASE: ReleaseInfo = {
  version: '1.0.0',
  downloadUrl: RELEASES_URL,
  size: null,
  publishedAt: null,
  downloads: null,
  live: false,
};

interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

interface GithubRelease {
  tag_name?: string;
  name?: string;
  published_at?: string;
  assets?: GithubAsset[];
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDownloads(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
}

/**
 * Reads the latest published release from the GitHub API. The API allows 60
 * unauthenticated requests per hour per IP, so every failure path degrades to
 * FALLBACK_RELEASE instead of blocking the download button.
 */
export async function fetchLatestRelease(signal?: AbortSignal): Promise<ReleaseInfo> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`GitHub API responded ${response.status}`);
  }

  const release = (await response.json()) as GithubRelease;
  const assets = release.assets ?? [];
  const apks = assets.filter((asset) => asset.name.toLowerCase().endsWith('.apk'));
  const primary = apks[0];

  const downloads = apks.reduce((total, asset) => total + (asset.download_count ?? 0), 0);
  const rawTag = release.tag_name ?? release.name ?? FALLBACK_RELEASE.version;

  return {
    version: rawTag.replace(/^v/i, '') || FALLBACK_RELEASE.version,
    downloadUrl: primary?.browser_download_url ?? RELEASES_URL,
    size: primary ? formatBytes(primary.size) || null : null,
    publishedAt: release.published_at ? formatDate(release.published_at) : null,
    downloads: apks.length > 0 ? downloads : null,
    live: true,
  };
}
