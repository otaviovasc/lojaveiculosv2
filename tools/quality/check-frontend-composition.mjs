import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const webRoot = join(root, "apps/web/src");
const exceptions = JSON.parse(
  readFileSync(
    join(root, "docs/frontend-migration/composition-exceptions.json"),
    "utf8",
  ),
);
const exceptionPaths = new Set(exceptions.files.map((item) => item.path));
const failures = [];

for (const file of walk(webRoot).filter(isCompositionFile)) {
  const rel = relative(root, file);
  const source = readFileSync(file, "utf8");
  const violations = findViolations(source, file);
  if (violations.length === 0) continue;
  if (exceptionPaths.has(rel)) continue;
  failures.push(`${rel}: ${violations.join(", ")}`);
}

if (failures.length > 0) {
  console.error("Frontend composition violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Move local components/types into feature modules, *Parts.tsx, or types.ts.",
  );
  process.exit(1);
}

console.log("Frontend composition guardrails passed.");

function findViolations(source, file) {
  const fileStem = basename(file, ".tsx");
  const allowedNames = new Set([fileStem, "App"]);
  const violations = [];
  const localType =
    /^\s*(?:export\s+)?(?:type|interface)\s+[A-Z_a-z]\w*(?:\s|<|=|\{)/gm;
  const localComponent = /^\s*(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/gm;
  const exportedComponent = /^\s*export\s+function\s+([A-Z][A-Za-z0-9_]*)/gm;

  if (localType.test(source)) violations.push("local type/interface");

  const exported = [...source.matchAll(exportedComponent)].map(
    (match) => match[1],
  );
  for (const name of exported) allowedNames.add(name);

  for (const match of source.matchAll(localComponent)) {
    const name = match[1];
    if (!allowedNames.has(name)) violations.push(`local component ${name}`);
  }

  return violations;
}

function isCompositionFile(file) {
  if (!file.endsWith(".tsx")) return false;
  const rel = relative(webRoot, file);
  return (
    rel.startsWith("app/") ||
    /(?:Page|Module|View|Workspace)\.tsx$/.test(basename(file))
  );
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}
