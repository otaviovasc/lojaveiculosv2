import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const featuresRoot = join(root, "apps/web/src/features");
const localPrimitiveNames = [
  "ActionMenu",
  "Card",
  "Drawer",
  "EmptyState",
  "ErrorState",
  "FilterBar",
  "FormSection",
  "Dialog",
  "List",
  "ListItem",
  "LoadingState",
  "Modal",
  "Metric",
  "PageHeader",
  "PageShell",
  "PageToolbar",
  "PreviewPanel",
  "Section",
  "SectionHeader",
  "SettingsPanel",
  "StatCard",
  "StatusBadge",
  "SummaryTile",
  "Tabs",
  "Toolbar",
];
const declarationPattern = new RegExp(
  String.raw`^\s*(?:export\s+)?(?:function|const)\s+(${localPrimitiveNames.join("|")})\b`,
  "gm",
);
const allowMarker = "feature-primitives-allow-local";
const allowMarkerPattern = /feature-primitives-allow-local:\s+\S(?:.*\S)?/;
const primitiveSuggestions = {
  ActionMenu: "FeatureRowAction/FeatureActionButton or a new FeatureActionMenu",
  Card: "FeatureCard or FeatureStatCard",
  Dialog: "FeatureDialog",
  Drawer: "FeatureDrawer",
  EmptyState: "FeatureEmptyState",
  ErrorState: "FeatureAlert or FeatureLoadingState",
  FilterBar: "FeatureToolbar with FeatureSearchField/FeatureSelect",
  FormSection: "FeatureFormSection",
  List: "FeatureList",
  ListItem:
    "FeatureListItemButton or a feature-specific item using FeatureCard",
  LoadingState: "FeatureLoadingState",
  Modal: "FeatureDialog",
  PageHeader: "FeaturePageHeader",
  PageShell: "FeaturePageShell",
  PageToolbar: "FeatureToolbar",
  PreviewPanel: "FeaturePreviewPanel",
  Section: "FeatureSection",
  SectionHeader: "FeatureCardHeader",
  SettingsPanel: "FeatureSettingsPanel",
  StatCard: "FeatureStatCard or FeatureKpiCard",
  StatusBadge: "FeatureStatusBadge",
  SummaryTile: "FeatureStatCard or FeatureKpiCard",
  Tabs: "FeatureTabs or FeatureSegmentedControl",
  Toolbar: "FeatureToolbar",
};
const failures = [];

runParserRegressionChecks();

for (const file of walk(featuresRoot).filter(isFeatureScreenFile)) {
  const source = readFileSync(file, "utf8");
  if (source.includes(allowMarker)) {
    if (allowMarkerPattern.test(source)) continue;
    failures.push(
      `${relative(root, file)} uses ${allowMarker} without a short reason. Use ${allowMarker}: <reason>.`,
    );
    continue;
  }

  const matches = [...source.matchAll(declarationPattern)].map(
    (match) => match[1],
  );
  if (matches.length === 0) continue;

  failures.push(
    `${relative(root, file)} declares local generic UI: ${matches
      .map(
        (name) =>
          `${name} (use ${primitiveSuggestions[name] ?? "a shared Feature primitive"})`,
      )
      .join(", ")}`,
  );
}

if (failures.length > 0) {
  console.error("Feature primitive guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Use apps/web/src/components/ui feature primitives, add a primitive variant, or add feature-primitives-allow-local: <reason> for a narrow exception.",
  );
  process.exit(1);
}

console.log("Feature primitive guardrails passed.");

function isFeatureScreenFile(file) {
  return file.endsWith(".tsx");
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
  assertMatch(
    "function Dialog() { return null; }",
    "Dialog",
    "dialog duplicates should be blocked",
  );
  assertMatch(
    "function FilterBar() { return null; }",
    "FilterBar",
    "filter bar duplicates should be blocked",
  );
  assertMatch(
    "const Drawer = () => null;",
    "Drawer",
    "drawer duplicates should be blocked",
  );
  assertMatch(
    "const ListItem = () => null;",
    "ListItem",
    "list item duplicates should be blocked",
  );
  assertMatch(
    "function PreviewPanel() { return null; }",
    "PreviewPanel",
    "preview panel duplicates should be blocked",
  );
  assertNoMatch(
    "function FiscalProviderPanel() { return null; }",
    "specific helper names should be allowed",
  );
  assertNoMatch(
    "function SectionWrapperBlock() { return null; }",
    "domain-specific section block names should be allowed",
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
