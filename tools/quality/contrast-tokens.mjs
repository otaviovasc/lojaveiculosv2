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

export function findSemanticContrastViolations(themes) {
  const failures = [];
  for (const currentTheme of themes) {
    const pairs = currentTheme.name.includes(":")
      ? semanticPairs.filter(([backgroundName]) =>
          ["--color-accent", "--color-accent-strong"].includes(backgroundName),
        )
      : semanticPairs;
    for (const [backgroundName, foregroundName] of pairs) {
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
      if (ratio < minimumTextContrast) {
        failures.push(
          `${currentTheme.name}: ${backgroundName} + ${foregroundName} is ${ratio.toFixed(2)}:1; require ${minimumTextContrast}:1`,
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
