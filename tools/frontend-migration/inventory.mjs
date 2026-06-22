import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
  flattenReferencedPaths,
  formatRef,
  isCiMode,
  readBoard,
  relativeFromRepo,
  repoPath,
} from "./board-utils.mjs";

const board = readBoard();
const ci = isCiMode();
const check = process.argv.includes("--check");
const referenced = flattenReferencedPaths(board);
const discovered = [];

scanRepo("lojaveiculos", ["src/app"]);
scanRepo("repasses-frontend", ["src/pages"]);
scanRepo("lojaveiculosv2", [
  "apps/web/src/app/App.tsx",
  "apps/web/src/components",
  "apps/web/src/features",
]);

const unclassified = discovered.filter(
  (ref) => !referenced.has(formatRef(ref)),
);

for (const ref of discovered) {
  console.log(
    `${referenced.has(formatRef(ref)) ? "covered" : "missing"} ${formatRef(ref)}`,
  );
}

if (check && unclassified.length > 0) {
  console.error("\nUnclassified user-facing frontend surfaces:");
  for (const ref of unclassified) console.error(`- ${formatRef(ref)}`);
  process.exit(1);
}

if (check) {
  console.log(
    `\nInventory complete: ${discovered.length} surfaces classified.`,
  );
}

function scanRepo(repo, roots) {
  const root = repoPath(repo, board);
  if (!existsSync(root)) {
    if (ci && repo !== "lojaveiculosv2") return;
    throw new Error(`Missing repo for inventory scan: ${repo} at ${root}`);
  }

  for (const rel of roots) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const file of walk(path)) maybeAdd(repo, file);
    } else {
      maybeAdd(repo, path);
    }
  }
}

function maybeAdd(repo, absPath) {
  if (!absPath.endsWith(".tsx")) return;
  const rel = relativeFromRepo(absPath, repo, board);
  const name = basename(rel);

  if (repo === "lojaveiculos") {
    if (
      rel.endsWith("/page.tsx") ||
      /^src\/app\/\[slug\]\/admin\/components\/views\/[^/]+View\.tsx$/.test(rel)
    ) {
      discovered.push({ repo, path: rel });
    }
    return;
  }

  if (repo === "repasses-frontend") {
    if (
      rel.startsWith("src/pages/") &&
      name.endsWith(".tsx") &&
      !rel.includes("/components/")
    ) {
      discovered.push({ repo, path: rel });
    }
    return;
  }

  if (
    rel === "apps/web/src/app/App.tsx" ||
    /^apps\/web\/src\/components\/(AppShell|DashboardHome|ModulePlaceholder)\.tsx$/.test(
      rel,
    ) ||
    /^apps\/web\/src\/features\/.+(Module|Page|View|Workspace)\.tsx$/.test(rel)
  ) {
    discovered.push({ repo, path: rel });
  }
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
