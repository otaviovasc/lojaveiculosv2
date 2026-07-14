import postcss from "postcss";
import {
  minimumContrastOnSurfaces,
  minimumTextContrast,
  resolveColor,
} from "./contrast-colors.mjs";
import { findCssStateIntersectionViolations } from "./contrast-css-intersections.mjs";

const stateSelectorPattern =
  /:(?:hover|active|focus|focus-visible|focus-within)\b|\[(?:aria-(?:selected|current|pressed|checked|expanded)|data-(?:state|selected|active))|\.(?:active|is-(?:active|selected|current|checked|open))\b|-(?:active|selected|current|checked|open)\b/i;

export function findCssStateContrastViolations(file, source, themes) {
  const root = postcss.parse(source, { from: file });
  const baseStyles = collectBaseStyles(root);
  const failures = [];

  root.walkRules((rule) => {
    const background = declarationValue(rule, [
      "background-color",
      "background",
    ]);
    if (!background || /(?:gradient|url)\(/i.test(background)) return;
    const explicitForeground = declarationValue(rule, ["color"]);
    for (const selector of rule.selectors) {
      const explicitPairFailure = explicitForeground
        ? findDynamicAccentPairFailure(background, explicitForeground)
        : null;
      if (explicitPairFailure) {
        failures.push(
          `${file}:${rule.source.start.line} ${selector.trim()}: ${explicitPairFailure}`,
        );
      }
      if (!stateSelectorPattern.test(selector)) continue;
      const base = baseStyles.get(baseSelector(selector));
      const foreground = explicitForeground ?? base?.foreground;
      if (!foreground) continue;
      const dynamicPairFailure = findDynamicAccentPairFailure(
        background,
        foreground,
      );
      if (dynamicPairFailure && !explicitPairFailure) {
        failures.push(
          `${file}:${rule.source.start.line} ${selector.trim()}: ${dynamicPairFailure}`,
        );
        continue;
      }
      const result = worstThemeContrast(background, foreground, themes);
      if (!result || result.ratio >= minimumTextContrast) continue;
      failures.push(
        `${file}:${rule.source.start.line} ${selector.trim()}: ${background} + ${foreground} is ${result.ratio.toFixed(2)}:1 in ${result.theme}; require ${minimumTextContrast}:1`,
      );
    }
  });
  failures.push(...findCssStateIntersectionViolations(file, root, themes));
  return [...new Set(failures)];
}

function findDynamicAccentPairFailure(background, foreground) {
  const match = background
    .trim()
    .match(/^var\(--color-(accent|accent-strong)\)$/);
  if (!match) return null;
  const expected = `var(--color-${match[1]}-foreground)`;
  if (foreground.trim() === expected) return null;
  return `${background} must pair with ${expected} because tenant accent colors are dynamic`;
}

function collectBaseStyles(root) {
  const styles = new Map();
  root.walkRules((rule) => {
    const foreground = declarationValue(rule, ["color"]);
    const background = declarationValue(rule, [
      "background-color",
      "background",
    ]);
    if (!foreground && !background) return;
    for (const selector of rule.selectors) {
      const key = selector.trim();
      styles.set(key, {
        ...styles.get(key),
        ...(background ? { background } : {}),
        ...(foreground ? { foreground } : {}),
      });
    }
  });
  return styles;
}

function declarationValue(rule, properties) {
  return declarationNode(rule, properties)?.value ?? null;
}

function declarationNode(rule, properties) {
  let value = null;
  rule.walkDecls((declaration) => {
    if (properties.includes(declaration.prop)) value = declaration;
  });
  return value;
}

function baseSelector(selector) {
  return selector
    .replace(/:(?:hover|active|focus|focus-visible|focus-within)\b/g, "")
    .replace(
      /\[(?:aria-(?:selected|current|pressed|checked|expanded)|data-(?:state|selected|active))[^\]]*\]/g,
      "",
    )
    .replace(/\.(?:active|is-(?:active|selected|current|checked|open))\b/g, "")
    .replace(/(?:--|-)(?:active|selected|current|checked|open)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function worstThemeContrast(background, foreground, themes) {
  let worst = null;
  for (const theme of themes) {
    const backgroundColor = resolveColor(background, theme.variables);
    const foregroundColor = resolveColor(foreground, theme.variables);
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

function stateSurfaces(backgroundValue, background, theme) {
  if (background.a >= 1) return theme.surfaces;
  return /(?:white|black|transparent|--color-inverse)/i.test(backgroundValue)
    ? null
    : theme.surfaces;
}
