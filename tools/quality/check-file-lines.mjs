import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const maxLines = 250;
const frontendMaxLines = maxLines + 100;
const ignored = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".terraform",
  ".agents",
  ".worktrees",
  "playwright-report",
  "test-results",
]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function ignoredFile(relativePath) {
  return relativePath.startsWith("docs/") && relativePath.endsWith(".md");
}

function scannedFile(relativePath) {
  if (extensions.has(extensionOf(relativePath))) return true;
  return (
    relativePath.startsWith("tools/quality/") && relativePath.endsWith(".mjs")
  );
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;

    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else {
      const relativePath = relative(root, path);
      if (scannedFile(relativePath) && !ignoredFile(relativePath)) {
        files.push(path);
      }
    }
  }

  return files;
}

const offenders = walk(root).flatMap((file) => {
  const lines = readFileSync(file, "utf8").split("\n").length;
  const relativePath = relative(root, file);
  const fileMaxLines = relativePath.startsWith("apps/web/")
    ? frontendMaxLines
    : maxLines;
  return lines > fileMaxLines ? [{ file, lines, maxLines: fileMaxLines }] : [];
});

if (offenders.length > 0) {
  console.error("Files exceed max line count:");
  for (const offender of offenders) {
    console.error(`${offender.file}: ${offender.lines} > ${offender.maxLines}`);
  }
  process.exit(1);
}
