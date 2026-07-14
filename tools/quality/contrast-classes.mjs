import {
  minimumContrastOnSurfaces,
  minimumTextContrast,
  parseColor,
  resolveColor,
  withOpacity,
} from "./contrast-colors.mjs";

const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;

export function findClassContrastViolations(file, source, themes) {
  const failures = [];
  for (const match of source.matchAll(stringPattern)) {
    const classValue = match[2];
    if (!classValue.includes("bg-") || !classValue.includes("text-")) continue;
    const groups = classGroups(classValue);
    const base = groups.get("") ?? {};
    for (const [scope, group] of groups) {
      const scopedForeground = group.foreground ?? base.foreground;
      const dynamicPairFailure = findDynamicAccentPairFailure(
        group.background,
        scopedForeground,
      );
      if (dynamicPairFailure) {
        const line = source.slice(0, match.index).split("\n").length;
        const state = scope ? ` in ${scope}` : "";
        failures.push(`${file}:${line}${state}: ${dynamicPairFailure}`);
      }
      if (!isInteractionScope(scope)) continue;
      const background = group.background ?? base.background;
      const foreground = scopedForeground;
      if (!background || !foreground) continue;
      const result = worstThemeContrast(background, foreground, themes);
      if (!result || result.ratio >= minimumTextContrast) continue;
      const line = source.slice(0, match.index).split("\n").length;
      const state = scope ? ` in ${scope}` : "";
      failures.push(
        `${file}:${line}${state}: ${background.raw} + ${foreground.raw} is ${result.ratio.toFixed(2)}:1 in ${result.theme}; require ${minimumTextContrast}:1`,
      );
    }
  }
  return [...new Set(failures)];
}

function findDynamicAccentPairFailure(background, foreground) {
  if (
    !background ||
    background.opacity !== 1 ||
    !["accent", "accent-strong"].includes(background.name) ||
    !foreground
  ) {
    return null;
  }
  const expected =
    background.name === "accent"
      ? "accent-foreground"
      : "accent-strong-foreground";
  if (foreground.name === expected && foreground.opacity === 1) return null;
  return `${background.raw} must pair with text-${expected} because tenant accent colors are dynamic`;
}

function classGroups(classValue) {
  const groups = new Map();
  for (const token of classValue.split(/\s+/)) {
    const parsed = parseUtility(token);
    if (!parsed) continue;
    const group = groups.get(parsed.scope) ?? {};
    group[parsed.kind] = parsed;
    groups.set(parsed.scope, group);
  }
  return groups;
}

function parseUtility(rawToken) {
  const token = rawToken.replace(/^!/, "");
  const separator = token.lastIndexOf(":");
  const scope = separator === -1 ? "" : token.slice(0, separator);
  const utility = separator === -1 ? token : token.slice(separator + 1);
  const match = utility.match(/^(bg|text)-([^/]+)(?:\/(.+))?$/);
  if (!match || match[2].startsWith("[")) return null;
  if (match[1] === "text" && isTextLayoutUtility(match[2])) return null;
  return {
    kind: match[1] === "bg" ? "background" : "foreground",
    name: match[2],
    opacity: parseOpacity(match[3]),
    raw: rawToken,
    scope,
  };
}

function isTextLayoutUtility(name) {
  return /^(?:(?:[2-9]?xl|xs|sm|base|lg)|left|right|center|justify|start|end|ellipsis|clip|wrap|nowrap|balance|pretty)$/.test(
    name,
  );
}

function parseOpacity(rawOpacity) {
  if (!rawOpacity) return 1;
  const value = rawOpacity.match(/^\[(\d+(?:\.\d+)?)\]$/)?.[1] ?? rawOpacity;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return parsed > 1 ? parsed / 100 : parsed;
}

function worstThemeContrast(background, foreground, themes) {
  let worst = null;
  for (const theme of themes) {
    const backgroundColor = utilityColor(background, theme.variables);
    const foregroundColor = utilityColor(foreground, theme.variables);
    if (!backgroundColor || !foregroundColor || theme.surfaces.length === 0) {
      continue;
    }
    const surfaces = stateSurfaces(background, backgroundColor, theme);
    if (!surfaces) continue;
    const ratio = minimumContrastOnSurfaces(
      foregroundColor,
      backgroundColor,
      surfaces,
    );
    if (!worst || ratio < worst.ratio) worst = { ratio, theme: theme.name };
  }
  return worst;
}

function stateSurfaces(backgroundUtility, background, theme) {
  if (background.a >= 1) return theme.surfaces;
  return /^(?:black|white|transparent|inverse(?:-|$))/.test(
    backgroundUtility.name,
  )
    ? null
    : theme.surfaces;
}

function isInteractionScope(scope) {
  return /(?:^|:)(?:hover|active|focus|focus-visible|focus-within|group-hover|group-active|aria-|data-|group-data-|peer-data-)|\[(?:[^\]]*(?:hover|active|focus|selected|checked|current|open))/i.test(
    scope,
  );
}

function utilityColor(utility, variables) {
  const named = parseColor(utility.name);
  const color =
    named ?? resolveColor(`var(--color-${utility.name})`, variables);
  return color ? withOpacity(color, utility.opacity) : null;
}
