import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const maxLines = 240;
const lineLimitExceptions = new Map([
  ["apps/web/src/components/DashboardHome.tsx", 950],
  ["apps/web/src/components/ui/dashboard-sidebar.tsx", 360],
  ["apps/web/src/features/agency/AgencyLayout.tsx", 320],
  ["apps/web/src/features/agency/pages/AgencyDashboardPage.tsx", 780],
  ["apps/web/src/features/inventory/pages/InventoryListPage.tsx", 260],
  ["apps/web/src/styles/components.css", 290],
  ["apps/web/src/styles/dashboard.css", 460],
]);
const ignored = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".terraform",
]);
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
  const relativePath = relative(root, file);
  const fileMaxLines = lineLimitExceptions.get(relativePath) ?? maxLines;
  return lines > fileMaxLines ? [{ file, lines, maxLines: fileMaxLines }] : [];
});

if (offenders.length > 0) {
  console.error("Files exceed max line count:");
  for (const offender of offenders) {
    console.error(`${offender.file}: ${offender.lines} > ${offender.maxLines}`);
  }
  process.exit(1);
}
