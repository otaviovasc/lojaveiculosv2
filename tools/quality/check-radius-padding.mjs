import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { findCssViolations } from "./radius-padding-css.mjs";
import { findJsxViolations } from "./radius-padding-jsx.mjs";
import { buildRadiusScale } from "./radius-padding-values.mjs";

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
    failures.push(
      ...findCssViolations(file, readFileSync(file, "utf8"), radiusScale, root),
    );
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
