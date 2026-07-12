import { join } from "node:path";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";
import {
  findWebUiContractViolations,
  webUiContractMessages,
} from "./web-ui-contract-rules.mjs";

const webRoot = join(repoRoot, "apps/web/src");
const extensions = new Set([".ts", ".tsx"]);
const failures = walkFiles(webRoot, { extensions }).flatMap((file) =>
  findWebUiContractViolations(file, readText(file)).map(({ kind, line }) => {
    const contract = webUiContractMessages[kind];
    return `${repoPath(file)}:${line}: ${contract.label}. ${contract.suggestion}`;
  }),
);

if (failures.length > 0) {
  console.error("Web UI contract violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Web UI contract guardrails passed.");
