import { join } from "node:path";
import {
  findCiWorkflowViolations,
  findDependabotActionsViolations,
} from "./ci-workflow-rules.mjs";
import { readText, repoRoot } from "./quality-files.mjs";

const failures = [
  ...findCiWorkflowViolations(
    readText(join(repoRoot, ".github/workflows/ci.yml")),
  ),
  ...findDependabotActionsViolations(
    readText(join(repoRoot, ".github/dependabot.yml")),
  ),
];

if (failures.length > 0) {
  console.error("CI security violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CI security guardrails passed.");
