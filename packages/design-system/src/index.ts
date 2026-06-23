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
} as const;

export const radiusTokens = {
  lg: "var(--radius-lg)",
  md: "var(--radius-md)",
  sm: "var(--radius-sm)",
} as const;

export const shadowTokens = {
  focus: "var(--shadow-focus)",
  panel: "var(--shadow-panel)",
} as const;

export const layoutTokens = {
  contentMax: "var(--layout-content-max)",
  headerHeight: "var(--layout-header-height)",
  sidebarWidth: "var(--layout-sidebar-width)",
} as const;

export const designTokens = {
  colors: colorTokens,
  layout: layoutTokens,
  radii: radiusTokens,
  shadows: shadowTokens,
} as const;

export const colors = colorTokens;
