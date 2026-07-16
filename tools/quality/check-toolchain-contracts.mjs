import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  readText,
  repoPath,
  repoRoot,
  walkFiles,
  workspaceRoots,
} from "./quality-files.mjs";
import {
  findBaseTsconfigViolations,
  findDeployableBuildViolations,
  findEslintContractViolations,
  findSuppressionCommentViolations,
  findWorkspaceTsconfigViolations,
} from "./toolchain-contract-rules.mjs";

const baseConfig = join(repoRoot, "tsconfig.base.json");
const eslintConfig = join(repoRoot, "eslint.config.js");
const failures = [
  ...findBaseTsconfigViolations(repoPath(baseConfig), readText(baseConfig)),
  ...findEslintContractViolations(
    repoPath(eslintConfig),
    readText(eslintConfig),
  ),
  ...deployableBuildFailures(),
];
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

for (const file of walkFiles(repoRoot, { extensions: sourceExtensions })) {
  failures.push(
    ...findSuppressionCommentViolations(repoPath(file), readText(file)).map(
      ({ file: sourceFile, line, marker }) =>
        `${sourceFile}:${line}: ${marker} bypasses typed validation`,
    ),
  );
}

for (const configFile of workspaceConfigs()) {
  failures.push(
    ...findWorkspaceTsconfigViolations(
      repoPath(configFile),
      readText(configFile),
      ".",
    ),
  );
}

if (failures.length > 0) {
  console.error("Toolchain contract violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Toolchain contract guardrails passed.");

function workspaceConfigs() {
  return workspaceRoots().flatMap((workspace) => {
    const file = join(workspace, "tsconfig.json");
    return existsSync(file) ? [file] : [];
  });
}

function deployableBuildFailures() {
  return [
    ["apps/api/package.json", "tsc --noEmit"],
    ["apps/web/package.json", "tsc -b && vite build"],
  ].flatMap(([file, expectedBuild]) =>
    findDeployableBuildViolations(
      file,
      readText(join(repoRoot, file)),
      expectedBuild,
    ),
  );
}
