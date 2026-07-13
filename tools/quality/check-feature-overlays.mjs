import { join } from "node:path";
import { findFeatureOverlayViolations } from "./feature-overlay-rules.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const featureRoot = join(repoRoot, "apps/web/src/features");
const debt = JSON.parse(
  readText(join(repoRoot, "tools/quality/feature-overlay-debt.json")),
);
const debtFiles = debt.files ?? {};
const seenDebt = new Set();
const failures = [];

for (const file of walkFiles(featureRoot, { extensions: new Set([".tsx"]) })) {
  if (/\.(?:test|spec)\.tsx$/.test(file)) continue;
  const path = repoPath(file);
  const violations = findFeatureOverlayViolations(path, readText(file));
  const allowance = debtFiles[path];

  if (!allowance) {
    for (const violation of violations) {
      failures.push(`${path}:${violation.line}: ${violation.kind}`);
    }
    continue;
  }

  seenDebt.add(path);
  if (
    typeof allowance !== "object" ||
    allowance === null ||
    !Number.isInteger(allowance.maxViolations) ||
    allowance.maxViolations < 1
  ) {
    failures.push(
      `${path}: feature overlay debt needs a positive integer ceiling`,
    );
    continue;
  }
  if (typeof allowance.reason !== "string" || !allowance.reason.trim()) {
    failures.push(`${path}: feature overlay debt needs a reason`);
  }
  if (violations.length !== allowance.maxViolations) {
    failures.push(
      `${path}: overlay debt ceiling is ${allowance.maxViolations}, current count is ${violations.length}; update the implementation and debt manifest together`,
    );
  }
}

for (const path of Object.keys(debtFiles)) {
  if (!seenDebt.has(path)) failures.push(`${path}: stale feature overlay debt`);
}

if (failures.length > 0) {
  console.error("Feature overlay guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Use shared Dialog, FeatureDialog, FeatureDrawer, or ConfirmDialog primitives.",
  );
  process.exit(1);
}

console.log("Feature overlay guardrails passed.");
