import { join } from "node:path";
import { findLegacyCrmRuntimeReferences } from "./canonical-crm-runtime-rules.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const roots = [
  join(repoRoot, "apps/api/src"),
  join(repoRoot, "apps/web/src"),
  join(repoRoot, "packages/db/src/schema"),
  join(repoRoot, "tools/db"),
  join(repoRoot, "tools/migration"),
  join(repoRoot, "tools/qa"),
];
const extensions = new Set([".js", ".mjs", ".ts", ".tsx"]);
const productionFiles = walkFiles(roots, { extensions }).filter(
  (file) =>
    !/\.(?:rawDb\.)?test\.[cm]?[jt]sx?$/.test(file) &&
    repoPath(file) !== "tools/db/run-crm-canonical-inbound-raw-test.mjs",
);
const offenders = productionFiles.flatMap((file) =>
  findLegacyCrmRuntimeReferences(readText(file)).map((finding) => ({
    file,
    ...finding,
  })),
);

if (offenders.length > 0) {
  console.error("Legacy CRM runtime references found:");
  for (const offender of offenders) {
    console.error(
      `${repoPath(offender.file)}:${offender.line}: ${offender.term}`,
    );
  }
  process.exit(1);
}

console.log("Canonical CRM runtime guardrails passed.");
