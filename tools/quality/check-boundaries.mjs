import { join } from "node:path";
import { findDomainBoundaryViolations } from "./domain-boundary-rules.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const domainsRoot = join(repoRoot, "apps/api/src/domains");
const extensions = new Set([".ts", ".tsx"]);
const offenders = walkFiles(domainsRoot, { extensions }).flatMap((file) =>
  findDomainBoundaryViolations(file, readText(file), repoRoot).map(
    ({ line, specifier }) => ({ file, line, specifier }),
  ),
);

if (offenders.length > 0) {
  console.error("Domain boundary violations:");
  for (const offender of offenders) {
    console.error(
      `${repoPath(offender.file)}:${offender.line}: ${offender.specifier}`,
    );
  }
  process.exit(1);
}

console.log("Domain boundary guardrails passed.");
