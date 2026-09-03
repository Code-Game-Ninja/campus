/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** owner/repo that publishes the APK. Defaults to Code-Game-Ninja/campus. */
  readonly VITE_GITHUB_REPO?: string;
  /** Fallback link used when the GitHub API is unreachable or rate limited. */
  readonly VITE_RELEASES_URL?: string;
  /** Web3Forms access key. Without it the report form runs in preview mode. */
  readonly VITE_WEB3FORMS_KEY?: string;
  /** Cloudinary cloud name for unsigned screenshot uploads. */
  readonly VITE_CLOUDINARY_CLOUD?: string;
  /** Cloudinary unsigned upload preset name. */
  readonly VITE_CLOUDINARY_PRESET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
