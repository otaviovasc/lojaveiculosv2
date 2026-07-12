import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

export const repoRoot = new URL("../../", import.meta.url).pathname;

export const defaultIgnoredDirectories = new Set([
  ".agents",
  ".git",
  ".terraform",
  ".worktrees",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export function walkFiles(roots, options = {}) {
  const rootList = Array.isArray(roots) ? roots : [roots];
  return rootList.flatMap((root) => walk(root, options));
}

export function repoPath(file) {
  return relative(repoRoot, file);
}

export function readText(file) {
  return readFileSync(file, "utf8");
}

export function extensionOf(file) {
  return extname(file);
}

export function workspaceRoots() {
  return ["apps", "packages"].flatMap((scope) => {
    const scopeRoot = join(repoRoot, scope);
    return readdirSync(scopeRoot, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(join(scopeRoot, entry.name, "package.json")),
      )
      .map((entry) => join(scopeRoot, entry.name));
  });
}

function walk(dir, options, files = []) {
  const ignoredDirectories =
    options.ignoredDirectories ?? defaultIgnoredDirectories;
  const extensions = options.extensions ?? null;

  for (const entry of readdirSync(dir)) {
    if (ignoredDirectories.has(entry)) continue;

    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, options, files);
    } else if (!extensions || extensions.has(extensionOf(path))) {
      files.push(path);
    }
  }

  return files;
}
