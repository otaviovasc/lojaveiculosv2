import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findJsxViolations } from "./radius-padding-jsx.mjs";
import { buildRadiusScale, parseLengthPx } from "./radius-padding-values.mjs";

const root = new URL("../../", import.meta.url).pathname;
const checkedRoots = [
  join(root, "apps/web/src"),
  join(root, "packages/design-system/src"),
];
const tokenSource = readFileSync(
  join(root, "apps/web/src/styles/tokens.css"),
  "utf8",
);
const radiusScale = buildRadiusScale(tokenSource);
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const failures = [];

runParserRegressionChecks();

for (const file of checkedRoots.flatMap((checkedRoot) => walk(checkedRoot))) {
  if (file.endsWith(".css")) {
    failures.push(...findCssViolations(file, readFileSync(file, "utf8")));
  } else {
    failures.push(
      ...findJsxViolations(file, readFileSync(file, "utf8"), radiusScale, root),
    );
  }
}

if (failures.length > 0) {
  console.error("Radius/padding guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Nested surfaces must satisfy outer radius = inner radius + padding/inset.",
  );
  process.exit(1);
}

console.log("Radius/padding guardrails passed.");

function findCssViolations(file, source) {
  const rules = parseCssRules(source);
  const found = [];
  for (const parent of rules.filter(
    (rule) => rule.radius !== null && rule.padding !== null,
  )) {
    for (const child of rules.filter((rule) =>
      childSelector(parent.selector, rule.selector),
    )) {
      if (child.radius === null) continue;
      const expectedInner = parent.radius - parent.padding;
      if (expectedInner < 0 || closeEnough(child.radius, expectedInner))
        continue;
      found.push(formatCssViolation(file, parent, child, expectedInner));
    }
  }
  return found;
}

function parseCssRules(source) {
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
      padding: parseCssPadding(declarations.padding),
      radius: parseLengthPx(declarations["border-radius"] ?? "", radiusScale),
      selector,
    });
  }
  return rules;
}

function parseCssPadding(value) {
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

function formatCssViolation(file, parent, child, expectedInner) {
  return `${relative(root, file)}:${child.line}: ${child.selector} radius ${px(child.radius)} inside ${parent.selector}; expected inner radius ${px(expectedInner)}.`;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (checkedExtensions.has(extensionOf(path))) files.push(path);
  }
  return files;
}

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function closeEnough(actual, expected) {
  return Math.abs(actual - expected) <= 0.5;
}

function px(value) {
  return `${Number(value.toFixed(2))}px`;
}

function runParserRegressionChecks() {
  const ok = findJsxViolations(
    "Fixture.tsx",
    '<div className="rounded-lg p-1"><button className="w-full rounded-md" /></div>',
    radiusScale,
    root,
  );
  const bad = findJsxViolations(
    "Fixture.tsx",
    '<div className="rounded-lg p-0.5"><button className="flex-1 rounded-md" /></div>',
    radiusScale,
    root,
  );
  const inset = findJsxViolations(
    "Fixture.tsx",
    '<button className="relative rounded-lg"><span className="absolute inset-1 rounded-md" /></button>',
    radiusScale,
    root,
  );
  if (ok.length || bad.length !== 1 || inset.length) {
    console.error("Radius/padding checker self-test failed.");
    process.exit(1);
  }
}
