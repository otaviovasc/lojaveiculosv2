export const defaultRadiusPx = {
  DEFAULT: 4,
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 24,
  "4xl": 32,
};

const sideState = () => ({ top: null, right: null, bottom: null, left: null });

export function buildRadiusScale(tokenSource = "") {
  const scale = { ...defaultRadiusPx };
  for (const match of tokenSource.matchAll(
    /--radius-([a-z0-9-]+):\s*([^;]+);/gi,
  )) {
    const [, name, value] = match;
    if (value.includes(`var(--radius-${name})`)) continue;
    const px = parseLengthPx(value, scale);
    if (px !== null) scale[name] = px;
  }
  return scale;
}

export function analyzeClassName(className, radiusScale) {
  const metrics = {
    classes: new Set(),
    insetPx: null,
    paddingPx: null,
    radius: null,
    hasSurface: false,
  };
  const padding = sideState();
  const inset = sideState();

  for (const rawToken of className.split(/\s+/).filter(Boolean)) {
    const token = baseClass(rawToken);
    if (!token) continue;
    metrics.classes.add(token);
    if (surfaceClass(token)) metrics.hasSurface = true;

    const radius = parseRadiusClass(token, radiusScale);
    if (radius) metrics.radius = { ...radius, className: rawToken };

    const spacing = parseSpacingClass(token);
    if (!spacing) continue;
    const target = spacing.kind === "padding" ? padding : inset;
    applySpacing(target, spacing.sides, spacing.px);
  }

  metrics.paddingPx = uniformSides(padding);
  metrics.insetPx = uniformSides(inset);
  return metrics;
}

export function parseLengthPx(value, radiusScale = defaultRadiusPx) {
  const clean = value.trim().replaceAll("_", " ");
  const radiusVar = clean.match(/^var\(--radius-([a-z0-9-]+)\)$/i);
  if (radiusVar) return radiusScale[radiusVar[1]] ?? null;

  const calc = clean.match(/^calc\((.+)\)$/);
  if (calc) return parseCalcPx(calc[1], radiusScale);

  const px = clean.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);

  const rem = clean.match(/^(-?\d+(?:\.\d+)?)rem$/);
  if (rem) return Number(rem[1]) * 16;

  if (clean === "0") return 0;
  return null;
}

function parseCalcPx(expression, radiusScale) {
  const parts = expression
    .replace(/\s*([+-])\s*/g, " $1 ")
    .trim()
    .split(/\s+/);
  let total = null;
  let sign = 1;

  for (const part of parts) {
    if (part === "+") {
      sign = 1;
      continue;
    }
    if (part === "-") {
      sign = -1;
      continue;
    }
    const px = parseLengthPx(part, radiusScale);
    if (px === null) return null;
    total = (total ?? 0) + sign * px;
  }

  return total;
}

function baseClass(token) {
  const important = token.startsWith("!") ? token.slice(1) : token;
  if (important.includes(":")) return null;
  return important;
}

function parseRadiusClass(token, radiusScale) {
  const match = token.match(/^rounded(?:-(.+))?$/);
  if (!match) return null;
  const value = match[1] ?? "DEFAULT";
  if (value === "full") return { px: Infinity };
  if (value.startsWith("[") && value.endsWith("]")) {
    const px = parseLengthPx(value.slice(1, -1), radiusScale);
    return px === null ? null : { px };
  }
  const px = radiusScale[value];
  return px === undefined ? null : { px };
}

function parseSpacingClass(token) {
  const match = token.match(
    /^(p|px|py|pt|pr|pb|pl|inset|inset-x|inset-y|top|right|bottom|left)-(.+)$/,
  );
  if (!match) return null;
  const [, utility, value] = match;
  const px = parseSpacingValue(value);
  if (px === null) return null;
  return {
    kind: utility.startsWith("p") ? "padding" : "inset",
    px,
    sides: spacingSides[utility],
  };
}

function parseSpacingValue(value) {
  if (value === "px") return 1;
  if (value.startsWith("[") && value.endsWith("]")) {
    return parseLengthPx(value.slice(1, -1));
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value) * 4;
  return null;
}

const spacingSides = {
  p: ["top", "right", "bottom", "left"],
  px: ["right", "left"],
  py: ["top", "bottom"],
  pt: ["top"],
  pr: ["right"],
  pb: ["bottom"],
  pl: ["left"],
  inset: ["top", "right", "bottom", "left"],
  "inset-x": ["right", "left"],
  "inset-y": ["top", "bottom"],
  top: ["top"],
  right: ["right"],
  bottom: ["bottom"],
  left: ["left"],
};

function applySpacing(state, sides, px) {
  for (const side of sides) state[side] = px;
}

function uniformSides(state) {
  const sides = [state.top, state.right, state.bottom, state.left];
  if (sides.some((side) => side === null)) return null;
  return sides.every((side) => Math.abs(side - sides[0]) < 0.01)
    ? sides[0]
    : null;
}

function surfaceClass(token) {
  return (
    token.startsWith("bg-") ||
    token.startsWith("border") ||
    token.startsWith("ring-") ||
    token.startsWith("shadow")
  );
}
