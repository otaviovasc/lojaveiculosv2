import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const featuresRoot = join(root, "apps/web/src/features");
const localPrimitiveNames = [
  "EmptyState",
  "List",
  "Metric",
  "PageHeader",
  "PageShell",
  "PageToolbar",
  "SectionHeader",
  "StatCard",
  "StatusBadge",
  "SummaryTile",
  "Toolbar",
];
const declarationPattern = new RegExp(
  String.raw`^\s*(?:export\s+)?(?:function|const)\s+(${localPrimitiveNames.join("|")})\b`,
  "gm",
);
const allowMarker = "feature-primitives-allow-local";
const failures = [];

runParserRegressionChecks();

for (const file of walk(featuresRoot).filter(isFeatureScreenFile)) {
  const source = readFileSync(file, "utf8");
  if (source.includes(allowMarker)) continue;

  const matches = [...source.matchAll(declarationPattern)].map(
    (match) => match[1],
  );
  if (matches.length === 0) continue;

  failures.push(
    `${relative(root, file)} declares local generic UI: ${matches.join(", ")}`,
  );
}

if (failures.length > 0) {
  console.error("Feature primitive guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Use apps/web/src/components/ui feature primitives, add a primitive variant, or add the feature-primitives-allow-local marker with a narrow reason.",
  );
  process.exit(1);
}

console.log("Feature primitive guardrails passed.");

function isFeatureScreenFile(file) {
  if (!file.endsWith(".tsx")) return false;
  return /(?:Page|Module|View|Workspace|Pipeline)\.tsx$/.test(basename(file));
}

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
  assertMatch(
    "function EmptyState() { return null; }",
    "EmptyState",
    "function declarations should be blocked",
  );
  assertMatch(
    "const PageHeader = () => null;",
    "PageHeader",
    "const declarations should be blocked",
  );
  assertNoMatch(
    "function FiscalProviderPanel() { return null; }",
    "specific helper names should be allowed",
  );
}

function assertMatch(source, expected, label) {
  declarationPattern.lastIndex = 0;
  const match = declarationPattern.exec(source);
  if (match?.[1] === expected) return;
  console.error(`Feature primitive checker self-test failed: ${label}`);
  process.exit(1);
}

function assertNoMatch(source, label) {
  declarationPattern.lastIndex = 0;
  if (!declarationPattern.test(source)) return;
  console.error(`Feature primitive checker self-test failed: ${label}`);
  process.exit(1);
}
