import { readdirSync, readFileSync, statSync } from "node:fs";
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
