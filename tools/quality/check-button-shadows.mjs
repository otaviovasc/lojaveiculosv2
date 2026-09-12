import { join } from "node:path";
import {
  analyzeJsxButtonShadows,
  findCssButtonShadowViolations,
} from "./button-shadow-rules.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const checkedRoots = [
  join(repoRoot, "apps/web/src"),
  join(repoRoot, "packages/design-system/src"),
];
const scriptExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const scriptFiles = walkFiles(checkedRoots, { extensions: scriptExtensions });
const actionClassNames = new Set();
const jsxViolations = [];
for (const file of scriptFiles) {
  const result = analyzeJsxButtonShadows(file, readText(file));
  for (const className of result.actionClassNames) {
    actionClassNames.add(className);
  }
  jsxViolations.push(...result.violations);
}
const violations = [
  ...jsxViolations,
  ...walkFiles(checkedRoots, { extensions: new Set([".css"]) }).flatMap(
    (file) =>
      findCssButtonShadowViolations(file, readText(file), actionClassNames),
  ),
];

if (violations.length > 0) {
  console.error("Button shadow guardrail violations:");
  for (const violation of violations) {
    console.error(
      `- ${repoPath(violation.file)}:${violation.line}: ${violation.detail}. Buttons and action controls must stay flat; only the shared focus-visible ring is allowed.`,
    );
  }
  process.exit(1);
}

console.log("Button shadow guardrails passed.");
