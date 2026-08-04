import postcss from "postcss";
import {
  minimumContrastOnSurfaces,
  minimumTextContrast,
  resolveColor,
} from "./contrast-colors.mjs";

const semanticPairs = [
  ["--color-background", "--color-foreground"],
  ["--color-card", "--color-card-foreground"],
  ["--color-popover", "--color-popover-foreground"],
  ["--color-primary", "--color-primary-foreground"],
  ["--color-secondary", "--color-secondary-foreground"],
  ["--color-destructive", "--color-destructive-foreground"],
  ["--color-success", "--color-success-foreground"],
  ["--color-warning", "--color-warning-foreground"],
  ["--color-accent", "--color-accent-foreground"],
  ["--color-accent-strong", "--color-accent-strong-foreground"],
  ["--color-accent-soft", "--color-accent-soft-foreground"],
  ["--color-green-soft", "--color-success-soft-foreground"],
  ["--color-blue-soft", "--color-info-soft-foreground"],
];

export function buildContrastThemes(
  tokensSource,
  publicSource = "",
  contextualSource = "",
) {
  const root = postcss.parse(tokensSource);
  const base = declarationsForRule(root, (selector) => selector === ":root");
  const aliases = declarationsForAtRule(root, "theme");
  const light = applyVariables(base, aliases);
  const darkOverrides = declarationsForRule(
    root,
    (selector) => selector === ':root[data-theme="dark"]',
  );
  const dark = applyVariables(applyVariables(base, darkOverrides), aliases);
  const themes = [theme("light", light), theme("dark", dark)];

  if (publicSource) {
    const publicRoot = postcss.parse(publicSource);
    const builder = declarationsForRule(publicRoot, (selector) =>
      selector.includes(".website-builder-surface"),
    );
    const publicLight = declarationsForRule(publicRoot, (selector) =>
      selector.includes(".public-light-surface"),
    );
    themes.push(
      theme(
        "public-light",
        applyVariables(applyVariables(light, builder), publicLight),
      ),
    );
  }
  if (contextualSource) {
    addContextualThemes(themes, contextualSource, light, dark);
  }
  return themes;
}

// Contextual module themes (`light:expenses`, `dark:documents`, ...) rebind the
// accent palette to a module identity color. Those accents are decorative —
// badges, highlights, charts, gradients — not body-text surfaces, so they are
// held to the WCAG 3:1 minimum for large text / UI components instead of the
// 4.5:1 body-text minimum used by the base themes.
const contextualAccentMinimum = 3;

// Explicitly accepted contextual accent pairs that fall below even the 3:1
// floor. The finance gold family (`--color-finance` #b89418 in light, and
// `--color-finance-strong` #b89418 in dark) pairs with its light foreground at
// 2.88:1; those modules never render text on the solid accent — the accent is
// an identity/decorative color. Keep this list narrow: any new module accent
// pairing below 3:1 must fail here and be fixed in the palette, not added to
// this list without a documented design reason.
const contextualAccentExemptions = new Set([
  "light:expenses:--color-accent",
  "light:commissions:--color-accent",
  "light:auto-entries:--color-accent",
  "dark:expenses:--color-accent-strong",
  "dark:commissions:--color-accent-strong",
  "dark:auto-entries:--color-accent-strong",
]);

export function findSemanticContrastViolations(themes) {
  const failures = [];
  for (const currentTheme of themes) {
    const isContextual = currentTheme.name.includes(":");
    const pairs = isContextual
      ? semanticPairs.filter(([backgroundName]) =>
          ["--color-accent", "--color-accent-strong"].includes(backgroundName),
        )
      : semanticPairs;
    const requiredMinimum = isContextual
      ? contextualAccentMinimum
      : minimumTextContrast;
    for (const [backgroundName, foregroundName] of pairs) {
      if (
        contextualAccentExemptions.has(`${currentTheme.name}:${backgroundName}`)
      ) {
        continue;
      }
      const background = resolveColor(
        `var(${backgroundName})`,
        currentTheme.variables,
      );
      const foreground = resolveColor(
        `var(${foregroundName})`,
        currentTheme.variables,
      );
      if (!background || !foreground) {
        failures.push(
          `${currentTheme.name}: cannot resolve semantic contrast pair ${backgroundName} + ${foregroundName}`,
        );
        continue;
      }
      const ratio = minimumContrastOnSurfaces(
        foreground,
        background,
        currentTheme.surfaces,
      );
      if (ratio < requiredMinimum) {
        failures.push(
          `${currentTheme.name}: ${backgroundName} + ${foregroundName} is ${ratio.toFixed(2)}:1; require ${requiredMinimum}:1`,
        );
      }
    }
  }
  return failures;
}

function declarationsForRule(root, matches) {
  const variables = {};
  root.walkRules((rule) => {
    if (!matches(rule.selector)) return;
    applyDeclarations(variables, rule);
  });
  return variables;
}

function addContextualThemes(themes, source, light, dark) {
  const root = postcss.parse(source);
  const modules = new Set();
  root.walkRules((rule) => {
    for (const match of rule.selector.matchAll(
      /\[data-active-module=["']([^"']+)["']\]/g,
    )) {
      modules.add(match[1]);
    }
  });
  for (const module of modules) {
    const selector = `[data-active-module="${module}"]`;
    const lightOverrides = declarationsForRule(
      root,
      (ruleSelector) =>
        ruleSelector.includes(selector) && !ruleSelector.includes("data-theme"),
    );
    const darkOverrides = declarationsForRule(
      root,
      (ruleSelector) =>
        ruleSelector.includes(selector) && ruleSelector.includes("data-theme"),
    );
    themes.push(
      theme(`light:${module}`, applyVariables(light, lightOverrides)),
      theme(
        `dark:${module}`,
        applyVariables(applyVariables(dark, lightOverrides), darkOverrides),
      ),
    );
  }
}

function declarationsForAtRule(root, name) {
  const variables = {};
  root.walkAtRules(name, (rule) => applyDeclarations(variables, rule));
  return variables;
}

function applyDeclarations(variables, container) {
  container.each((node) => {
    if (node.type !== "decl" || !node.prop.startsWith("--")) return;
    const value = node.important ? `${node.value} !important` : node.value;
    if (clean(value) === `var(${node.prop})`) return;
    variables[node.prop] = value;
  });
}

function applyVariables(base, overrides) {
  return { ...base, ...overrides };
}

function theme(name, variables) {
  const surfaces = ["--color-panel", "--color-app"]
    .map((token) => resolveColor(`var(${token})`, variables))
    .filter(Boolean);
  return { name, surfaces, variables };
}

function clean(value) {
  return value.replace(/\s*!important\s*$/i, "").trim();
}
