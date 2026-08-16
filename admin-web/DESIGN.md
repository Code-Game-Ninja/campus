---
name: CampusSphere Admin Web
description: Permission-aware campus operations with calm, high-signal staff workflows.
colors:
  primary: "#183B75"
  primary-deep: "#102E5D"
  success: "#2B8B57"
  warning: "#9B6100"
  canvas: "#F4F7FB"
  surface: "#FFFFFF"
  surface-soft: "#F2F6FC"
  border: "#DCE5F0"
  text: "#18263D"
  text-muted: "#738197"
  text-faint: "#8793A7"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "0.09em"
rounded:
  sm: "7px"
  md: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  2xl: "30px"
  3xl: "38px"
  4xl: "52px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 13px"
    height: "35px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#40536E"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 13px"
    height: "35px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "22px"
  status-success:
    backgroundColor: "#E7F6ED"
    textColor: "#26784B"
    typography: "{typography.label}"
    rounded: "5px"
    padding: "5px 8px"
---

# Design System: CampusSphere Admin Web

## Overview

**Creative North Star: "The Glass Operations Ledger"**

CampusSphere Admin Web is an operating surface, not a marketing page. Its design should make scope, status, ownership, and next action legible within seconds. The visual world is cool, precise, and premium: navy authority for decisions, atmospheric blue light behind the workspace, translucent tool surfaces with strong text contrast, and one restrained status vocabulary for risk and health.

The current mock uses a glass navigation rail, a compact translucent top bar, small-radius panels, ambient color fields, and thin light-catching borders. Blur is bounded to the shell and tool surfaces; tables, labels, and status text remain opaque enough for repeated work. Dark-mode tokens preserve the same depth hierarchy.

The design taste and gpt-taste inputs are adapted for an admin context. Asymmetry appears in information priority and panel width, not in theatrical composition. Smoothness comes from short state transitions, skeleton loading, list reveal, and responsive layout changes. No scroll hijacking, cinematic hero, decorative marquee, or visual effect may delay an operational task.

**Key Characteristics:**

- High-signal workspace with one dominant navy accent.
- Scope context visible before any list or action.
- Tonal layering and thin borders instead of heavy shadows.
- Dense enough for repeated work, open enough for scanning.
- Motion reserved for feedback, hierarchy, and state transition.

**Direction contract:** `DESIGN_VARIANCE: 5`, `MOTION_INTENSITY: 5`, `VISUAL_DENSITY: 6`. The system favors a controlled asymmetrical operations grid, a scoped data table, and a service-health list over a marketing hero. Motion uses authored workspace transitions, staggered panel continuity, view transitions, and small hover physics with a reduced-motion fallback. Scroll pinning, infinite marquees, and scroll hijacking remain excluded because they harm repeated admin work.

## Colors

The palette uses one authoritative navy accent against cool blue-gray neutrals. Green and amber are semantic states only, never decoration.

### Primary

- **Campus Navy** (`#183B75`): primary navigation state, primary actions, links, and active scope emphasis.
- **Campus Navy Deep** (`#102E5D`): pressed and hover state for primary actions. Use sparingly so action feedback remains clear.

### Secondary

- **Operational Green** (`#2B8B57`): healthy, published, active, or completed state. Pair with a text label.
- **Attention Amber** (`#9B6100`): review, pending, or elevated attention state. Never use as a generic accent.
- **Ambient Blue** (`rgba(129, 176, 255, 0.16)`): pointer-responsive workspace light behind glass surfaces only.
- **Ambient Mint** (`rgba(134, 214, 191, 0.11)`): quiet lower-field atmosphere behind content.
- **Ambient Violet** (`rgba(164, 130, 240, 0.12)`): low-opacity depth accent, never a control or status color.

### Neutral

- **Cool Canvas** (`#F4F7FB`): page background and workspace field.
- **Surface White** (`#FFFFFF`): panels, menus, tables, and form surfaces.
- **Soft Scope** (`#F2F6FC`): active scope context and low-emphasis grouping.
- **Border Mist** (`#DCE5F0`): panel borders, separators, and input outlines.
- **Ink** (`#18263D`): primary text and headings.
- **Muted Slate** (`#738197`): supporting copy and non-primary metadata.
- **Faint Slate** (`#8793A7`): labels, breadcrumbs, and secondary metadata.

**The One Accent Rule.** Use Campus Navy as the only general accent. Green and amber exist only to communicate real state. Do not introduce purple, gradient accents, or random colored dots.

## Typography

**Display Font:** Geist with `ui-sans-serif, system-ui, sans-serif` fallback.

**Body Font:** Geist with the same fallback.

**Label Font:** Geist in weight 750 with tracked uppercase labels for compact metadata.

**Character:** Neutral, crisp, and slightly technical without becoming terminal-like. The type system favors short headlines, readable body copy, and compact labels that support table scanning.

### Hierarchy

- **Display** (650, 30px, 1.12): page title only. Keep to one or two lines.
- **Headline** (650, 21px, 1.25): health summary or primary panel title.
- **Title** (650, 16px, 1.35): panel headings and dense section titles.
- **Body** (400, 13px, 1.5): descriptions, table cells, helper text, and activity details. Keep paragraphs under 65 characters per line where practical.
- **Label** (750, 10px, 1.2, 0.09em tracking, uppercase): scope labels, table headers, status labels, and metadata. Labels must remain short and concrete.

**The Short-Read Rule.** Every heading names one job. Every helper sentence explains one implication. Remove copy that does not help staff decide or act.

## Layout

Desktop uses a persistent 264px navigation rail, a 71px top bar, and a centered content field capped at 1440px. Page content uses 38px horizontal padding on wide screens, 24px at medium widths, and 16px on narrow screens.

The primary dashboard grid is four metric columns at wide desktop, two columns at medium widths, and one column on narrow screens. Operational panels use a flexible two-column split: activity and queue context on the left, quick actions or health detail on the right. Tables keep semantic columns and gain horizontal overflow on narrow screens rather than collapsing into ambiguous cards.

Navigation stays single-line on desktop. On screens below 720px, the rail becomes a compact horizontal navigation strip, the scope card moves out of the rail, and the content becomes one column. Critical actions remain visible; secondary actions move into menus.

Spacing follows a compact rhythm: 4, 8, 12, 16, 22, 30, 38, and 52px. Use more space above headings than below them. Do not insert empty bento cells, theatrical hero gaps, or decorative grid lines.

## Elevation & Depth

Depth is primarily tonal. The cool canvas separates white tools; Border Mist defines edges; panels remain flat at rest. Shadows are reserved for menus, dialogs, and transient overlays. A hover state may add a small tinted lift, but dashboard cards must not float like marketing tiles.

### Shadow Vocabulary

- **Overlay** (`0 12px 32px rgba(24, 59, 117, 0.14)`): dialogs, menus, and command surfaces only.
- **Hover Lift** (`0 4px 16px rgba(24, 59, 117, 0.08)`): interactive panels that genuinely open a deeper action.
- **Resting Panel:** no shadow. Border and tonal contrast carry the hierarchy.

**The Flat-By-Default Rule.** If a surface is not interactive or transient, it does not need a shadow.

## Shapes

The shape language is compact and consistent. Panels use 8px corners, controls use 7px corners, and status chips use a 5px radius. Full pills are reserved for compact filters, counts, and status where the silhouette communicates grouping.

Borders are 1px and cool. Focus rings are 2px Campus Navy with a 2px canvas offset. No component may mix sharp cards, large rounded cards, and pill controls without a semantic reason.

## Components

### Buttons

- **Shape:** 7px corners, 35px minimum height, 12px horizontal padding.
- **Primary:** Campus Navy fill, white label, compact icon plus verb. Hover uses Campus Navy Deep. Active state shifts down 1px.
- **Secondary:** white fill, Border Mist stroke, Ink or slate label. It never competes with the primary action.
- **Ghost:** transparent, slate label, no decorative border. Use only for low-risk navigation or dismissal.
- **Focus:** 2px Campus Navy ring with visible canvas offset.
- **Motion:** 160ms transform and color transition. Respect reduced motion.

### Chips and Status

- **Style:** short label, 5px radius, semantic background, semantic text, no icon-only meaning.
- **State:** Published, Active, Healthy use green. Review, Pending, and attention use amber. Draft and inactive use neutral gray.
- **Rule:** status text remains present when color is removed.

### Cards and Containers

- **Corner Style:** 8px panel, 7px control, 5px status.
- **Background:** Surface White on Cool Canvas, Soft Scope for context grouping.
- **Border:** 1px Border Mist.
- **Internal Padding:** 22px for primary panels, 17px for compact rows, 13px for context boxes.
- **Behavior:** cards represent a real tool boundary, not decoration. Prefer grouped whitespace for simple content.

### Inputs and Fields

- **Style:** white background, 1px Border Mist, 7px corners, 35px minimum height.
- **Label:** label above field. Never use placeholder as label.
- **Focus:** Campus Navy border plus 2px offset ring.
- **Error:** inline text below field in a dark red semantic token, with a clear corrective sentence.
- **Disabled:** reduced contrast and a reason where the role cannot perform the action.

### Navigation

- **Desktop:** 264px white rail with brand mark, active scope block, role-aware nav, and account footer.
- **Active:** Soft blue background and Campus Navy text. Count appears only when it represents a real queue.
- **Top bar:** 71px white row with breadcrumb, role context, notifications, and account control.
- **Mobile:** horizontal scroll strip with short labels. Do not hide the active role or scope.

### Scope Context

The scope block is a first-class component. It shows active campus or global context, current role, and whether data is mock, loading, or live. Production scope comes from `/admin/v1/me`; the client never invents it.

### Data Table

Tables use semantic `thead` and `tbody`, readable column names, compact row spacing, one row-action menu, and status labels. Bulk actions display exact count and affected scope before confirmation. On mobile, preserve table meaning with horizontal overflow or a deliberately designed detail view.

### Feedback Surface

Use inline empty, loading, error, permission-denied, and success states. Toasts are reserved for transient confirmations. Errors include request ID where it helps support. Destructive confirmation states name the target, scope, reason, and irreversible consequence.

## Do's and Don'ts

### Do:

- **Do** show campus or global scope in the first viewport and beside scoped lists.
- **Do** use one clear primary action per screen and short verb-first labels.
- **Do** use real status semantics with text, not decorative color.
- **Do** keep table headers, focus rings, and error copy WCAG 2.2 AA compliant.
- **Do** use skeletons that match final layout shape for data loading.
- **Do** reveal detail with restrained 160-240ms transitions and reduced-motion fallbacks.
- **Do** keep staff, event, moderation, and health surfaces separate by role.
- **Do** mark synthetic fixtures as mock in design preview and test environments.

### Don't:

- **Don't** use glass as decoration without hierarchy. Ambient gradients stay behind content, blur remains bounded, and readable surfaces keep sufficient opacity and contrast.
- **Don't** turn every metric into a floating card or use cards inside cards.
- **Don't** use scroll hijacking, cinematic hero sections, marquees, or infinite motion for admin work.
- **Don't** expose service credentials, arbitrary SQL, private message content, or unrestricted cross-campus data.
- **Don't** use color alone for status, permission, error, or health.
- **Don't** let campus admins change `campus_id` from a request body or query string.
- **Don't** present mock counts, health, or staff identities as live production evidence.
- **Don't** use em-dashes, vague labels, fake precision, or marketing copy in operational screens.
