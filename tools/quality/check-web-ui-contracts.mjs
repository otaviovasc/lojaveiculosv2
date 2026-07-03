import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const scopedRoots = [
  "apps/web/src/features/inventory",
  "apps/web/src/features/sales",
].map((path) => join(root, path));
const violations = [
  {
    label: "native <select>",
    pattern: /<select\b/,
    suggestion:
      "Use FeatureSelect, InventorySelect, or another CustomSelect wrapper.",
  },
  {
    label: "native date input",
    pattern: /\btype=["']date["']/,
    suggestion: "Use the shared DatePickerField used by DashboardHome.",
  },
  {
    label: "native browser warning",
    pattern: /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/,
    suggestion: "Use FeatureDialog, ConfirmDialog, or visible feature state.",
  },
];

runParserRegressionChecks();

const failures = [];
for (const file of scopedRoots.flatMap((scopeRoot) => walk(scopeRoot))) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const source = readFileSync(file, "utf8");
  for (const violation of violations) {
    if (!violation.pattern.test(source)) continue;
    failures.push(
      `${relative(root, file)}: ${violation.label}. ${violation.suggestion}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Web UI contract violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Web UI contract guardrails passed.");

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function runParserRegressionChecks() {
  assertViolation("<select><option /></select>", "native <select>");
  assertViolation('<input type="date" />', "native date input");
  assertViolation('window.alert("x")', "native browser warning");
  assertNoViolation("<FeatureSelect />", "custom select wrappers should pass");
}

function assertViolation(source, expected) {
  if (
    violations.some(
      (violation) =>
        violation.label === expected && violation.pattern.test(source),
    )
  ) {
    return;
  }
  console.error(`Web UI checker self-test failed: ${expected}`);
  process.exit(1);
}

function assertNoViolation(source, label) {
  if (violations.every((violation) => !violation.pattern.test(source))) return;
  console.error(`Web UI checker self-test failed: ${label}`);
  process.exit(1);
}
