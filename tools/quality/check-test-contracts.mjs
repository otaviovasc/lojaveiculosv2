import { existsSync } from "node:fs";
import { join } from "node:path";
import { createCoverageConfig } from "../testing/vitest-coverage-policy.mjs";
import {
  readText,
  repoPath,
  repoRoot,
  walkFiles,
  workspaceRoots,
} from "./quality-files.mjs";
import {
  findDisabledTestViolations,
  findTautologicalAssertionViolations,
  findWorkspaceTestViolations,
  isTestFile,
} from "./test-contract-rules.mjs";

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const allSourceFiles = walkFiles(repoRoot, { extensions: sourceExtensions });
const testFiles = allSourceFiles.filter(isTestFile);
const failures = testFiles.flatMap((file) =>
  findTestFileViolations(file, readText(file)),
);

function findTestFileViolations(file, source) {
  const path = repoPath(file);
  const disabled = findDisabledTestViolations(file, source).map(
    ({ callPath, line }) =>
      `${path}:${line}: ${callPath}(...) disables or focuses a test`,
  );
  const tautological = findTautologicalAssertionViolations(file, source).map(
    ({ line, matcher }) =>
      `${path}:${line}: expect(literal).${matcher}(same literal) cannot verify application behavior`,
  );
  return [...disabled, ...tautological];
}

for (const workspace of workspaceRoots()) {
  const sourceRoot = join(workspace, "src");
  if (!existsSync(sourceRoot)) continue;
  const runtimeFiles = walkFiles(sourceRoot, {
    extensions: sourceExtensions,
  }).filter((file) => !isTestFile(file));
  const workspaceTests = testFiles.filter((file) =>
    file.startsWith(`${workspace}/`),
  );
  const packageFile = join(workspace, "package.json");
  const packageSource = readText(packageFile);
  const packageJson = JSON.parse(packageSource);
  failures.push(
    ...findWorkspaceTestViolations({
      packageFile: repoPath(packageFile),
      packageSource,
      requireAssertions: createCoverageConfig(packageJson.name).test.expect
        ?.requireAssertions,
      runtimeFiles,
      testFiles: workspaceTests,
    }),
  );
}

if (failures.length > 0) {
  console.error("Test contract violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Test contract guardrails passed.");
