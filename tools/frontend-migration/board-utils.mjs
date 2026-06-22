import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(toolsRoot, "../..");
export const boardPath = join(repoRoot, "docs/frontend-migration/board.json");
export const planPath = join(repoRoot, "v2-plan.html");

export function readBoard() {
  return JSON.parse(readFileSync(boardPath, "utf8"));
}

export function repoPath(repoKey, board = readBoard()) {
  const repo = board.repos[repoKey];
  if (!repo) throw new Error(`Unknown repo key: ${repoKey}`);
  const path = resolve(repoRoot, repo.relative_path);
  if (existsSync(path) || !repo.worktree_relative_path) return path;
  return resolve(repoRoot, repo.worktree_relative_path);
}

export function resolveRef(ref, board = readBoard()) {
  return normalize(join(repoPath(ref.repo, board), ref.path));
}

export function refExists(ref, board = readBoard()) {
  return existsSync(resolveRef(ref, board));
}

export function formatRef(ref) {
  return `${ref.repo}:${ref.path}`;
}

export function allRefsForSlice(slice) {
  return [
    ...(slice.source_refs ?? []),
    ...(slice.supporting_source_refs ?? []),
    ...(slice.target_refs ?? []),
  ];
}

export function flattenReferencedPaths(board) {
  const paths = new Set();

  for (const slice of board.slices) {
    for (const ref of allRefsForSlice(slice)) {
      paths.add(formatRef(ref));
    }
  }

  for (const ignored of board.ignored_sources ?? []) {
    paths.add(formatRef(ignored));
  }

  return paths;
}

export function relativeFromRepo(absPath, repoKey, board = readBoard()) {
  return normalize(relative(repoPath(repoKey, board), absPath));
}

export function isCiMode() {
  return process.env.CI === "true" || process.argv.includes("--ci");
}

export function fail(message, failures) {
  failures.push(message);
}

export const valid = {
  classification: new Set([
    "migrate-now",
    "already-covered-in-v2",
    "stacked-after",
    "parallel-ok",
    "defer-placeholder",
    "do-not-port",
  ]),
  priority: new Set(["P0", "P1", "P2", "defer"]),
  reviewStatus: new Set([
    "not-opened",
    "needs-review",
    "changes-requested",
    "ready-for-merge",
    "merged",
    "deferred",
  ]),
  risk: new Set(["low", "medium", "high"]),
  status: new Set([
    "planned",
    "in-progress",
    "blocked",
    "ready",
    "merged",
    "deferred",
    "do-not-port",
  ]),
};
