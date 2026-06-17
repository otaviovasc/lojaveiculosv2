import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const maxLines = 240;
const ignored = new Set(["node_modules", "dist", "build", ".git"]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"]);

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;

    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (extensions.has(extensionOf(path))) {
      files.push(path);
    }
  }

  return files;
}

const offenders = walk(root).flatMap((file) => {
  const lines = readFileSync(file, "utf8").split("\n").length;
  return lines > maxLines ? [{ file, lines }] : [];
});

if (offenders.length > 0) {
  console.error("Files exceed max line count:");
  for (const offender of offenders) {
    console.error(`${offender.file}: ${offender.lines}`);
  }
  process.exit(1);
}
