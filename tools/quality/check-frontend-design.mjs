import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { findFrontendDesignViolations } from "./frontend-design-rules.mjs";

const root = new URL("../../", import.meta.url).pathname;
const checkedRoots = [
  join(root, "apps/web/src"),
  join(root, "packages/design-system/src"),
];
const ignoredPathParts = ["/apps/web/src/styles/", "/node_modules/", "/dist/"];
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (checkedExtensions.has(extensionOf(path))) {
      files.push(path);
    }
  }

  return files;
}

const failures = [];

for (const checkedRoot of checkedRoots) {
  for (const file of walk(checkedRoot)) {
    if (ignoredPathParts.some((part) => file.includes(part))) continue;

    const source = readFileSync(file, "utf8");
    failures.push(...findFrontendDesignViolations(file, source));
  }
}

if (failures.length > 0) {
  console.error("Frontend design convention violations:");
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}
