import { join } from "node:path";
import { findApiErrorEnvelopeViolations } from "./api-error-envelope-rules.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const scanRoots = ["apps/api/src/features", "apps/api/src/infrastructure/http"];
const allowedFiles = new Set([
  "apps/api/src/infrastructure/http/apiErrorResponse.ts",
]);
const failures = scanRoots.flatMap((scanRoot) =>
  walkFiles(join(repoRoot, scanRoot), { extensions: new Set([".ts"]) }).flatMap(
    (file) => {
      const path = repoPath(file);
      if (
        path.includes(".test.") ||
        path.includes(".testSupport") ||
        allowedFiles.has(path)
      ) {
        return [];
      }
      return findApiErrorEnvelopeViolations(file, readText(file)).map(
        ({ line, message }) => `${path}:${line}: ${message}`,
      );
    },
  ),
);

if (failures.length > 0) {
  console.error("API error envelope guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API error envelope guardrails passed.");
