import { join } from "node:path";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";
import {
  findInputMaskViolations,
  inputMaskMessages,
} from "./input-mask-rules.mjs";

const webRoot = join(repoRoot, "apps/web/src");
const extensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const failures = walkFiles(webRoot, { extensions }).flatMap((file) =>
  findInputMaskViolations(file, readText(file)).map(
    ({ kind, line, tagName }) => {
      const contract = inputMaskMessages[kind];
      return `${repoPath(file)}:${line}: ${contract.label} (${tagName}). ${contract.suggestion}`;
    },
  ),
);

if (failures.length > 0) {
  console.error("Input mask contract violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Input mask guardrails passed.");
