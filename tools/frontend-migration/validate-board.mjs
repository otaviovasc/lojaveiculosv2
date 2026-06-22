import { existsSync } from "node:fs";
import {
  allRefsForSlice,
  fail,
  formatRef,
  isCiMode,
  readBoard,
  refExists,
  repoPath,
  valid,
} from "./board-utils.mjs";

const board = readBoard();
const failures = [];
const ids = new Set();
const ci = isCiMode();

for (const key of Object.keys(board.repos ?? {})) {
  const path = repoPath(key, board);
  if (!existsSync(path) && !(ci && key !== "lojaveiculosv2")) {
    fail(`Repo path missing for ${key}: ${path}`, failures);
  }
}

for (const slice of board.slices ?? []) {
  if (!slice.id) fail("Slice missing id", failures);
  if (ids.has(slice.id)) fail(`Duplicate slice id: ${slice.id}`, failures);
  ids.add(slice.id);

  for (const [field, set] of [
    ["classification", valid.classification],
    ["priority", valid.priority],
    ["risk", valid.risk],
    ["status", valid.status],
  ]) {
    if (!set.has(slice[field])) {
      fail(`${slice.id}: invalid ${field} ${slice[field]}`, failures);
    }
  }

  if (!slice.name || !slice.domain || !slice.parallel_group) {
    fail(`${slice.id}: missing name/domain/parallel_group`, failures);
  }

  if (!slice.backend_contract?.owner) {
    fail(`${slice.id}: missing backend_contract.owner`, failures);
  }

  if (!slice.qa?.auth_mode || !slice.qa?.stack_profile) {
    fail(`${slice.id}: missing qa auth/stack metadata`, failures);
  }

  if (slice.surface_type !== "foundation" && !slice.qa?.visual?.command) {
    fail(`${slice.id}: screen slice missing qa.visual.command`, failures);
  }

  for (const dep of slice.depends_on ?? []) {
    if (
      !ids.has(dep) &&
      !board.slices.some((candidate) => candidate.id === dep)
    ) {
      fail(`${slice.id}: dependency does not exist: ${dep}`, failures);
    }
  }

  const refs = allRefsForSlice(slice);
  if (
    [
      "migrate-now",
      "already-covered-in-v2",
      "stacked-after",
      "parallel-ok",
    ].includes(slice.classification) &&
    refs.length === 0
  ) {
    fail(`${slice.id}: classified slice has no source/target refs`, failures);
  }

  for (const ref of refs) {
    if (ref.planned) continue;
    if (
      ci &&
      ref.repo !== "lojaveiculosv2" &&
      !existsSync(repoPath(ref.repo, board))
    ) {
      continue;
    }
    if (!refExists(ref, board)) {
      fail(`${slice.id}: missing ref ${formatRef(ref)}`, failures);
    }
  }

  const reviewStatus = slice.pr?.review_status;
  if (reviewStatus && !valid.reviewStatus.has(reviewStatus)) {
    fail(`${slice.id}: invalid review status ${reviewStatus}`, failures);
  }
}

detectCycles(board.slices ?? []);

if (failures.length > 0) {
  console.error("Frontend migration board validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${board.slices.length} frontend migration slices.`);

function detectCycles(slices) {
  const graph = new Map(
    slices.map((slice) => [slice.id, slice.depends_on ?? []]),
  );
  const visiting = new Set();
  const visited = new Set();

  function visit(id, path = []) {
    if (visiting.has(id)) {
      fail(`Dependency cycle: ${[...path, id].join(" -> ")}`, failures);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of graph.get(id) ?? []) visit(dep, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of graph.keys()) visit(id);
}
