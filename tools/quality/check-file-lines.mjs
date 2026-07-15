import { join } from "node:path";
import { findFileLineViolations } from "./file-line-rules.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const extensions = new Set([
  ".css",
  ".js",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);
const debt = JSON.parse(
  readText(join(repoRoot, "tools/quality/file-line-debt.json")),
);
const files = walkFiles(repoRoot, { extensions })
  .filter(
    (file) =>
      !file.endsWith(".mjs") || repoPath(file).startsWith("tools/quality/"),
  )
  .map((file) => ({
    lines: readText(file).split("\n").length,
    path: repoPath(file),
  }))
  .filter(({ path }) => path.startsWith("apps/api/"));
const failures = findFileLineViolations(files, debt);

if (failures.length > 0) {
  console.error("File line-count guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("File line-count guardrails passed.");
