import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readBoard, repoRoot } from "./board-utils.mjs";

const args = parseArgs();
const board = readBoard();
const slice = board.slices.find((item) => item.id === args.slice);

if (!slice) {
  console.error(`Unknown slice: ${args.slice}`);
  process.exit(1);
}

if (!["worker", "reviewer"].includes(args.role)) {
  console.error("--role must be worker or reviewer");
  process.exit(1);
}

validatePhaseGateAccess(args, board, slice);

const templatePath = join(
  repoRoot,
  `docs/frontend-migration/${args.role}-prompt.md`,
);
const template = readFileSync(templatePath, "utf8");

console.log(`${template}\n\n---\n\n${renderContext(slice, board)}`);

function validatePhaseGateAccess(args, board, slice) {
  if (args.role !== "worker") return;

  const currentPhase = (board.phases ?? []).find(
    (phase) => phase.id === board.current_phase_id,
  );
  if (currentPhase?.audit?.status !== "blocked") return;

  const remediationIds = new Set(
    currentPhase.audit?.remediation_slice_ids ?? [],
  );
  const isUnresolvedRemediation =
    remediationIds.has(slice.id) && slice.status !== "merged";

  if (isUnresolvedRemediation) return;

  console.error(
    [
      `Current phase ${currentPhase.id} is blocked by audit findings.`,
      `Worker prompts are paused for non-remediation slice ${slice.id}.`,
      `Start one unresolved remediation slice instead: ${[...remediationIds].join(", ") || "none"}.`,
      "Use --role reviewer only for review of an already-open PR.",
    ].join("\n"),
  );
  process.exit(1);
}

function renderContext(slice, board) {
  const phase = (board.phases ?? []).find((item) => item.id === slice.phase);
  return `# Slice Context

- Slice: ${slice.id} — ${slice.name}
- Phase: ${renderPhaseLabel(phase)}${slice.phase === board.current_phase_id ? " (current)" : ""}
- Domain: ${slice.domain}
- Priority: ${slice.priority}
- Classification: ${slice.classification}
- Risk: ${slice.risk}
- Thread: ${slice.thread.kind}, ${slice.thread.model}/${slice.thread.reasoning}
- Branch: ${slice.thread.branch}
- Dependencies: ${(slice.depends_on ?? []).join(", ") || "none"}
- Blocks: ${(slice.blocks ?? []).join(", ") || "none"}

## Phase Gate
${renderPhaseGate(phase, slice, board)}

## Source Refs
${renderRefs(slice.source_refs)}

## Supporting Refs
${renderRefs(slice.supporting_source_refs)}

## Target Refs
${renderRefs(slice.target_refs)}

## Backend Contract
- Owner: ${slice.backend_contract.owner}
- Notes: ${slice.backend_contract.notes}

## QA
- Auth: ${slice.qa.auth_mode}
- Stack: ${slice.qa.stack_profile}
- Seed: ${slice.qa.required_seed}
- Visual required: ${slice.qa.visual.required}
- Visual command: ${slice.qa.visual.command}
- Routes: ${(slice.qa.visual.routes ?? []).join(", ") || "none"}

## Reviewer Checklist
${(slice.review_checklist ?? board.default_review_checklist).map((item) => `- ${item}`).join("\n")}

## V1 Improvement / Backport Candidates
${(slice.v1_improvement_backport_candidates ?? []).map((item) => `- ${item}`).join("\n") || "- None recorded yet."}
`;
}

function renderPhaseLabel(phase) {
  if (!phase) return "none";
  return `${phase.id} — ${phase.name} — ${phase.status}`;
}

function renderPhaseGate(phase, slice, board) {
  if (!phase) return "- No phase assigned.";
  const audit = phase.audit ?? {};
  const findings = audit.findings ?? [];
  const relatedFindings = findings.filter(
    (finding) =>
      finding.remediation_slice_id === slice.id ||
      (finding.remediation_slice_ids ?? []).includes(slice.id),
  );
  const visibleFindings =
    relatedFindings.length > 0 || slice.phase !== board.current_phase_id
      ? relatedFindings
      : findings;
  return [
    `- Audit status: ${audit.status ?? "not-recorded"}`,
    `- Last checked: ${audit.last_checked_at ?? phase.last_checked_at ?? "n/a"}`,
    `- Remediation slices: ${(audit.remediation_slice_ids ?? []).join(", ") || "none"}`,
    `- Exit criteria: ${(phase.exit_criteria ?? []).join(" | ") || "none"}`,
    "",
    "### Blocked Findings",
    visibleFindings.length
      ? visibleFindings
          .map(
            (finding) =>
              `- ${finding.id}: ${finding.summary} -> ${finding.remediation_slice_id ?? (finding.remediation_slice_ids ?? []).join(", ")}`,
          )
          .join("\n")
      : "- None assigned to this slice.",
  ].join("\n");
}

function renderRefs(refs = []) {
  if (refs.length === 0) return "- none";
  return refs
    .map((ref) => `- ${ref.repo}:${ref.path}${ref.planned ? " (planned)" : ""}`)
    .join("\n");
}

function parseArgs() {
  const result = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg === "--slice") result.slice = process.argv[++index];
    if (arg === "--role") result.role = process.argv[++index];
  }
  if (!result.slice || !result.role) {
    console.error(
      "Usage: npm run migration:prompt -- --slice <id> --role worker|reviewer",
    );
    process.exit(1);
  }
  return result;
}
