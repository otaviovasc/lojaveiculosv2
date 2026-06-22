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
const slices = board.slices ?? [];
const sliceById = new Map(slices.map((slice) => [slice.id, slice]));
const phaseById = validatePhases(board, failures);

for (const key of Object.keys(board.repos ?? {})) {
  const path = repoPath(key, board);
  if (!existsSync(path) && !(ci && key !== "lojaveiculosv2")) {
    fail(`Repo path missing for ${key}: ${path}`, failures);
  }
}

for (const slice of slices) {
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
      !slices.some((candidate) => candidate.id === dep)
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

  const mergeStatus = slice.pr?.merge_status;
  if (mergeStatus && !valid.reviewStatus.has(mergeStatus)) {
    fail(`${slice.id}: invalid merge status ${mergeStatus}`, failures);
  }

  if (!slice.phase || !phaseById.has(slice.phase)) {
    fail(`${slice.id}: missing or invalid phase ${slice.phase}`, failures);
  }

  if (
    slice.status === "merged" &&
    (reviewStatus !== "merged" || mergeStatus !== "merged")
  ) {
    fail(`${slice.id}: merged slice must have merged review/merge status`, failures);
  }

  if (
    mergeStatus === "merged" &&
    (slice.status !== "merged" || reviewStatus !== "merged")
  ) {
    fail(`${slice.id}: merged PR metadata must match slice status`, failures);
  }

  if (
    slice.status === "merged" &&
    (slice.pr?.labels ?? []).includes("agent:human-hold")
  ) {
    fail(`${slice.id}: merged slice still has agent:human-hold label`, failures);
  }
}

validatePhaseLinks(board, sliceById, phaseById, failures);
detectCycles(slices);

if (failures.length > 0) {
  console.error("Frontend migration board validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Validated ${slices.length} frontend migration slices across ${phaseById.size} phases.`,
);

function validatePhases(board, failures) {
  const phases = board.phases ?? [];
  const phaseIds = new Set();
  const phaseById = new Map();

  if (!Array.isArray(phases) || phases.length === 0) {
    fail("Board missing phases", failures);
    return phaseById;
  }

  for (const phase of phases) {
    if (!phase.id) fail("Phase missing id", failures);
    if (phaseIds.has(phase.id)) fail(`Duplicate phase id: ${phase.id}`, failures);
    phaseIds.add(phase.id);
    phaseById.set(phase.id, phase);

    if (!phase.name || !phase.status) {
      fail(`${phase.id}: missing name/status`, failures);
    }
    if (!valid.phaseStatus.has(phase.status)) {
      fail(`${phase.id}: invalid phase status ${phase.status}`, failures);
    }
    if (phase.audit?.status && !valid.auditStatus.has(phase.audit.status)) {
      fail(`${phase.id}: invalid audit status ${phase.audit.status}`, failures);
    }
    if (phase.status === "blocked") validateBlockedPhaseShape(phase, failures);
  }

  if (!board.current_phase_id || !phaseById.has(board.current_phase_id)) {
    fail(`Invalid current_phase_id: ${board.current_phase_id}`, failures);
  }

  const currentPhase = phaseById.get(board.current_phase_id);
  if (currentPhase?.status === "blocked") {
    validateBlockedPhaseShape(currentPhase, failures);
  }

  return phaseById;
}

function validateBlockedPhaseShape(phase, failures) {
  if (phase.audit?.status !== "blocked") {
    fail(`${phase.id}: blocked phase must have blocked audit status`, failures);
  }
  if ((phase.audit?.findings ?? []).length === 0) {
    fail(`${phase.id}: blocked phase must list audit findings`, failures);
  }
  if ((phase.audit?.remediation_slice_ids ?? []).length === 0) {
    fail(`${phase.id}: blocked phase must list remediation_slice_ids`, failures);
  }
}

function validatePhaseLinks(board, sliceById, phaseById, failures) {
  for (const phase of board.phases ?? []) {
    const remediationIds = phase.audit?.remediation_slice_ids ?? [];
    let unmergedRemediationCount = 0;

    for (const remediationId of remediationIds) {
      const slice = sliceById.get(remediationId);
      if (!slice) {
        fail(`${phase.id}: unknown remediation slice ${remediationId}`, failures);
        continue;
      }
      if (slice.phase !== phase.id) {
        fail(`${remediationId}: remediation slice phase must be ${phase.id}`, failures);
      }
      if (slice.status !== "merged") unmergedRemediationCount += 1;
    }

    if (phase.status === "blocked" && unmergedRemediationCount === 0) {
      fail(`${phase.id}: blocked phase has no unmerged remediation slices`, failures);
    }
  }

  for (const phaseId of phaseById.keys()) {
    if (![...sliceById.values()].some((slice) => slice.phase === phaseId)) {
      fail(`${phaseId}: phase has no assigned slices`, failures);
    }
  }
}

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
