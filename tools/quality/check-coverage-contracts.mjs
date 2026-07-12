import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  coveragePolicies,
  scopedCoveragePolicies,
} from "../testing/vitest-coverage-policy.mjs";
import { findCoverageContractViolations } from "./coverage-contract-rules.mjs";
import {
  readText,
  repoPath,
  repoRoot,
  workspaceRoots,
} from "./quality-files.mjs";

const rootPackage = JSON.parse(readText(join(repoRoot, "package.json")));
const workspaces = workspaceRoots().map((root) => {
  const packageFile = join(root, "package.json");
  const configFile = join(root, "vitest.config.mjs");
  const packageJson = JSON.parse(readText(packageFile));
  return {
    configSource: existsSync(configFile) ? readText(configFile) : "",
    name: packageJson.name,
    packageFile: repoPath(packageFile),
    testCoverage: packageJson.scripts?.["test:coverage"],
  };
});

const failures = findCoverageContractViolations({
  policies: coveragePolicies,
  rootCoverageScript: rootPackage.scripts?.["test:coverage"],
  scopedPolicies: scopedCoveragePolicies,
  workspaces,
});

if (failures.length > 0) {
  console.error("Coverage contract violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Coverage contract guardrails passed.");
