# CampusSphere download portal

Public marketing and download site for the CampusSphere Android build, plus the
report and suggestion form. Static site, no server of its own.

```text
download-portal/  React 19 + Vite 8 + Tailwind v4 + Motion
      |
      +--> api.github.com        latest release: version, size, date, downloads
      +--> api.cloudinary.com    unsigned screenshot upload (optional)
      +--> api.web3forms.com     report and suggestion delivery (optional)
```

It installs standalone rather than through the npm workspace at the repo root,
so the Expo install in `prototype/` is untouched.

```powershell
cd E:\projects\campus\download-portal
npm install
npm run dev      # http://localhost:4180
npm run build    # tsc --noEmit && vite build -> dist/
npm run preview
```

## Configuration

Copy `.env.example` to `.env.local`. Every value is public: Vite inlines `VITE_*`
into the client bundle. Nothing secret belongs in this package.

| Variable | Effect when unset |
| --- | --- |
| `VITE_GITHUB_REPO` | Defaults to `Code-Game-Ninja/campus` |
| `VITE_RELEASES_URL` | Defaults to that repo's `/releases/latest` |
| `VITE_WEB3FORMS_KEY` | Form runs in preview mode: validates, delivers nothing |
| `VITE_CLOUDINARY_CLOUD` / `VITE_CLOUDINARY_PRESET` | Screenshot picker is hidden |

### Why two services for one form

Web3Forms, Formcarry and Formspree all gate file attachments behind paid plans.
The screenshot therefore goes browser to Cloudinary through an unsigned upload
preset, and only the resulting URL is sent along with the form fields. If you
would rather keep everything on Supabase, replace `submitFeedback` in
`src/lib/feedback.ts`; nothing else in the site knows how delivery works.

### Security note on the unsigned preset

An unsigned Cloudinary preset is a public write surface. Anyone who reads the
JavaScript bundle can upload to it. The client enforces PNG/JPG/WebP and 5 MB,
but only the Cloudinary console actually enforces anything. Before going live,
set the preset to unsigned, restrict allowed formats, set a max file size, scope
it to a dedicated folder, and turn on moderation.

## Screenshots

Every product image on the page is a real device capture. Originals (1080x2392)
live in `img_screens/`; the web copies in `public/screens/` are 640w WebP:

```text
home.webp  discover.webp  events.webp  notes.webp  teams.webp  chat.webp
```

Compressing the originals dropped the set from 2.0 MB to 211 kB. To add or
replace one, resize to 640w WebP at roughly quality 82 and add an entry to
`src/data/screens.ts`. An entry with no matching file renders a labelled empty
slot, so nothing ever falls back to a mock or a broken image.

The hero overlaps the home and discover captures, each bento tile shows the
screen it describes, and the gallery scrolls through all six. There are no stock
photos and no `<div>`-built fake UI anywhere on the page.

## Component conventions

The layout is shadcn-compatible without using the CLI: `@` aliases to `src/`,
shared primitives live in `src/components/ui/`, and `src/lib/utils.ts` exports
the standard `cn` helper (`clsx` + `tailwind-merge`). There is no
`components.json`, so `npx shadcn@latest add ...` would need `init` first. Any
component written against `@/components/ui` and `@/lib/utils` drops in unchanged.

`src/components/ui/floating-paths.tsx` is the animated hero backdrop. It was
adapted on the way in: gated on `useReducedMotion()`, restroked to the brand
accent instead of slate, given index-derived durations instead of `Math.random()`
during render, and stripped of an unused colour field. It is the only perpetual
animation on the page and it never sits over scrolling content.

## Deploying

Static output in `dist/`, so any static host works. Cloudflare Pages, matching
how `admin-web` is deployed:

```text
Root Directory:    download-portal
Build Command:     npm ci && npm run build
Output Directory:  dist
```

Set the `VITE_*` variables in the host's build environment. Vite inlines them at
build time, so redeploy after changing one.

## Design constraints in force

Light theme locked page-wide, single accent `#375DFB` inherited from the mobile
app's token preset, one radius scale (10px controls, 16px cards, 24px panels).
All motion is entry, reveal or feedback only, and every animated component gates
on `useReducedMotion()`. Feature copy is taken from the shipping screens under
`prototype/app` so the site does not promise behaviour the APK lacks.
