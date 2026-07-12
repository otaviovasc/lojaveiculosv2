# UI/UX visual quality contract

This contract protects the dealership-specific visual language while the V2
frontend evolves. It applies to store, agency, operational, and generated
document surfaces.

## Product signature

- Keep the application shell theme-aware and use the tenant brand inside it:
  warm light surfaces in light mode, graphite surfaces in dark mode, and
  matching logo variants in both.
- Keep the automotive LV watermark on operational page canvases. It must stay
  subtle enough for text contrast, but it must not be removed in favor of a
  generic flat SaaS background.
- Use color with meaning: red for primary action or blocking state, green for
  completed/available, blue for information or sold states, and gold for
  attention or pending work.
- Preserve operational density. A standard desktop viewport should expose the
  primary metrics, controls, and first useful records without decorative empty
  space.
- Do not add a generic oversized page header simply to repeat the module name
  already shown by the shell. Prefer a compact command deck, tabs with actions,
  or the established domain toolbar.
- Use real vehicle imagery and human-facing labels. Never display internal
  enums, storage keys, provider identifiers, or database ids as visual content.

## Shared patterns

- `FeaturePageShell` owns the branded canvas and responsive content boundary.
- KPI groups retain semantic color and render as four columns on wide screens
  and a compact two-by-two grid on mobile.
- Forms use red uppercase section labels and clear grouping where the existing
  product language already does so.
- Compact row actions are icon-only, have accessible names and tooltips, and
  represent real implemented operations only.
- Loading, empty, error, success, disabled, and permission-restricted states
  must remain visually distinct and readable at mobile sizes.

## Motion

- Anime.js is the shared entry-motion engine. React integrations use scoped
  instances with cleanup and honor `prefers-reduced-motion`.
- Use motion to explain entry, state change, or layout continuity. Do not use
  permanent ambient animation on dense operational screens.
- Recommended durations are 120 ms for feedback, 180-260 ms for controls, and
  at most 600 ms for a staged page entrance.
- Hidden-first entry wrappers must become visible without JavaScript animation
  when reduced motion is requested.

## Library roles

- Radix UI supplies accessible interaction behavior for overlays, menus, tabs,
  and progress controls while V2 owns styling.
- TanStack Table and Virtual are approved for genuinely large operational data
  surfaces; they should not replace simple native tables without a performance
  or state-management need.
- React-PDF is the canonical in-product PDF renderer. Resizable Panels may be
  used for authoring/inspection workspaces, Embla for media galleries, and
  Recharts for data-rich reports.
- React Bits and 21st.dev are reference sources for selective interaction and
  composition ideas, not visual themes to paste wholesale into the product.

## Visual comparison gate

Before accepting a broad visual rewrite:

1. Capture the existing and candidate states at `1440x900` and `390x844` using
   the seeded local environment.
2. Run an `agy` read-only comparison over the actual screenshots.
3. Score automotive identity, purposeful color, information density,
   hierarchy, navigation, responsive behavior, and premium quality.
4. Keep the candidate only where it wins. Build a hybrid when the shell or
   interaction improves but the existing page has stronger product identity.
5. Run Playwright overflow checks and Axe serious/critical checks before
   handoff.

## Generated artifacts

- PDFs must use A4 geometry, store branding, clear document control, readable
  signatures, and Portuguese labels.
- Artifact previews must render the same stored bytes users download.
- Regeneration must fail closed when renderer capability is unavailable.
- Seeded and production artifacts must not expose document ids, storage keys,
  tenant ids, request ids, or unresolved template tokens.
