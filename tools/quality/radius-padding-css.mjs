import { relative } from "node:path";
import { parseLengthPx } from "./radius-padding-values.mjs";

export function findCssViolations(file, source, radiusScale, root) {
  const rules = parseCssRules(source, radiusScale);
  const found = [];
  for (const parent of rules.filter(
    (rule) => rule.radius !== null && rule.padding !== null,
  )) {
    for (const child of rules.filter((rule) =>
      childSelector(parent.selector, rule.selector),
    )) {
      if (child.radius === null) continue;
      const expectedInner = parent.radius - parent.padding;
      if (expectedInner < 0 || closeEnough(child.radius, expectedInner)) {
        continue;
      }
      found.push(formatCssViolation(file, parent, child, expectedInner, root));
    }
  }
  return found;
}

function parseCssRules(source, radiusScale) {
  const rules = [];
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of clean.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    const declarations = Object.fromEntries(
      [...match[2].matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)].map((decl) => [
        decl[1],
        decl[2].trim(),
      ]),
    );
    rules.push({
      line: clean.slice(0, match.index).split("\n").length,
      padding: parseCssPadding(declarations.padding, radiusScale),
      radius: parseLengthPx(declarations["border-radius"] ?? "", radiusScale),
      selector,
    });
  }
  return rules;
}

function parseCssPadding(value, radiusScale) {
  if (!value) return null;
  const parts = value
    .split(/\s+/)
    .map((part) => parseLengthPx(part, radiusScale));
  if (parts.length === 1) return parts[0];
  return parts.length > 1 && parts.every((part) => part === parts[0])
    ? parts[0]
    : null;
}

function childSelector(parent, child) {
  return child.startsWith(`${parent} >`) || child.startsWith(`${parent}>`);
}

function formatCssViolation(file, parent, child, expectedInner, root) {
  return `${relative(root, file)}:${child.line}: ${child.selector} radius ${px(child.radius)} inside ${parent.selector}; expected inner radius ${px(expectedInner)}.`;
}

function closeEnough(actual, expected) {
  return Math.abs(actual - expected) <= 0.5;
}

function px(value) {
  return `${Number(value.toFixed(2))}px`;
}
