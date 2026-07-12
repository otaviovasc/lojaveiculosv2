export const colorTokens = {
  accent: "var(--color-accent)",
  accentStrong: "var(--color-accent-strong)",
  accentSoft: "var(--color-accent-soft)",
  app: "var(--color-app)",
  appElevated: "var(--color-app-elevated)",
  blueEnd: "var(--color-blue-end)",
  blueSoft: "var(--color-blue-soft)",
  blueStart: "var(--color-blue-start)",
  danger: "var(--color-danger)",
  greenEnd: "var(--color-green-end)",
  greenStart: "var(--color-green-start)",
  greenSoft: "var(--color-green-soft)",
  inverse: "var(--color-inverse)",
  inverseGhost: "var(--color-inverse-ghost)",
  inverseMuted: "var(--color-inverse-muted)",
  inverseSoft: "var(--color-inverse-soft)",
  line: "var(--color-line)",
  lineStrong: "var(--color-line-strong)",
  muted: "var(--color-muted)",
  panel: "var(--color-panel)",
  pinkEnd: "var(--color-pink-end)",
  pinkStart: "var(--color-pink-start)",
  primary: "var(--color-primary)",
  text: "var(--color-text)",
  violetEnd: "var(--color-violet-end)",
  violetStart: "var(--color-violet-start)",
  warning: "var(--color-warning)",
  canvas: "var(--color-canvas)",
  surface: "var(--color-surface)",
  surfaceRaised: "var(--color-surface-raised)",
  surfaceSubtle: "var(--color-surface-subtle)",
  ink: "var(--color-ink)",
  inkMuted: "var(--color-ink-muted)",
  sidebar: "var(--color-sidebar)",
  sidebarRaised: "var(--color-sidebar-raised)",
  sidebarText: "var(--color-sidebar-text)",
  sidebarMuted: "var(--color-sidebar-muted)",
  successStrong: "var(--color-success-strong)",
  warningStrong: "var(--color-warning-strong)",
} as const;

export const radiusTokens = {
  lg: "var(--radius-lg)",
  md: "var(--radius-md)",
  sm: "var(--radius-sm)",
  xl: "var(--surface-radius-xl)",
  xxl: "var(--surface-radius-2xl)",
} as const;

export const shadowTokens = {
  focus: "var(--shadow-focus)",
  panel: "var(--shadow-panel)",
  raised: "var(--shadow-raised)",
  float: "var(--shadow-float)",
} as const;

export const layoutTokens = {
  contentMax: "var(--layout-content-max)",
  headerHeight: "var(--layout-header-height)",
  sidebarWidth: "var(--layout-sidebar-width)",
  sidebarCompactWidth: "var(--layout-sidebar-compact-width)",
} as const;

export const fontTokens = {
  sans: "var(--font-sans)",
  bebas: "var(--font-race)",
  race: "var(--font-race)",
} as const;

export const designTokens = {
  colors: colorTokens,
  fonts: fontTokens,
  layout: layoutTokens,
  radii: radiusTokens,
  shadows: shadowTokens,
} as const;

export const colors = colorTokens;
export const fonts = fontTokens;
