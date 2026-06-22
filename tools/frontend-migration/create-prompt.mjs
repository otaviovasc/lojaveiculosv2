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

const templatePath = join(
  repoRoot,
  `docs/frontend-migration/${args.role}-prompt.md`,
);
const template = readFileSync(templatePath, "utf8");

console.log(`${template}\n\n---\n\n${renderContext(slice, board)}`);

function renderContext(slice, board) {
  return `# Slice Context

- Slice: ${slice.id} — ${slice.name}
- Domain: ${slice.domain}
- Priority: ${slice.priority}
- Classification: ${slice.classification}
- Risk: ${slice.risk}
- Thread: ${slice.thread.kind}, ${slice.thread.model}/${slice.thread.reasoning}
- Branch: ${slice.thread.branch}
- Dependencies: ${(slice.depends_on ?? []).join(", ") || "none"}
- Blocks: ${(slice.blocks ?? []).join(", ") || "none"}

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
