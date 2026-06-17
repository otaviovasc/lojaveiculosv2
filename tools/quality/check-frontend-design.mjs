import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g;
const runtimeTailwindPattern =
  /`[^`]*\$\{[^`]*(?:bg|text|border|from|to|via|ring|fill|stroke)-/g;
const failures = [];

for (const checkedRoot of checkedRoots) {
  for (const file of walk(checkedRoot)) {
    if (ignoredPathParts.some((part) => file.includes(part))) continue;

    const source = readFileSync(file, "utf8");
    const hardcodedColors = [...source.matchAll(hardcodedColorPattern)];
    const runtimeClasses = [...source.matchAll(runtimeTailwindPattern)];

    if (hardcodedColors.length > 0) {
      failures.push(
        `${file}: hardcoded color found; use design tokens/global CSS`,
      );
    }

    if (runtimeClasses.length > 0) {
      failures.push(
        `${file}: runtime-generated Tailwind color class found; use explicit variants`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Frontend design convention violations:");
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}
