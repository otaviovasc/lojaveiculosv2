import {
  parseTypeScriptSource,
  sourceLine,
  walkTypeScript,
} from "./typescript-source.mjs";
import {
  collectUiImports,
  componentDeclaration,
  hasExplicitPadding,
  importedFeatureCardName,
  isJsxOpening,
  renderedUiPrimitives,
} from "./feature-primitive-source.mjs";

const genericPrimitiveSuggestions = new Map([
  [
    "ActionMenu",
    "use FeatureRowAction/FeatureActionButton or add FeatureActionMenu",
  ],
  ["Card", "use FeatureCard or FeatureStatCard"],
  ["Dialog", "use FeatureDialog"],
  ["Drawer", "use FeatureDrawer"],
  ["EmptyState", "use FeatureEmptyState"],
  ["ErrorState", "use FeatureAlert"],
  ["FilterBar", "use FeatureToolbar with shared controls"],
  ["FormSection", "use FeatureFormSection"],
  ["List", "use FeatureList"],
  ["ListItem", "use FeatureListItemButton or FeatureCard"],
  ["LoadingState", "use FeatureLoadingState"],
  ["Modal", "use FeatureDialog"],
  ["PageHeader", "use FeaturePageHeader"],
  ["PageShell", "use FeaturePageShell"],
  ["PageToolbar", "use FeatureToolbar"],
  ["PreviewPanel", "use FeaturePreviewPanel"],
  ["Section", "use FeatureSection"],
  ["SectionHeader", "use FeatureCardHeader"],
  ["SettingsPanel", "use FeatureSettingsPanel"],
  ["StatCard", "use FeatureStatCard or FeatureKpiCard"],
  ["StatusBadge", "use FeatureStatusBadge"],
  ["SummaryTile", "use FeatureStatCard or FeatureKpiCard"],
  ["Tabs", "use FeatureTabs or FeatureSegmentedControl"],
  ["Toolbar", "use FeatureToolbar"],
]);

const composedStateRules = [
  {
    allowed: new Set(["FeatureAlert", "FeatureEmptyState"]),
    suffix: "EmptyState",
    suggestion:
      "compose FeatureEmptyState or FeatureAlert instead of local state markup",
  },
  {
    allowed: new Set(["FeatureLoadingState"]),
    suffix: "LoadingState",
    suggestion: "compose FeatureLoadingState instead of local loading markup",
  },
  {
    allowed: new Set(["FeatureAlert"]),
    suffix: "ErrorState",
    suggestion: "compose FeatureAlert instead of local error markup",
  },
];

const composedCardRules = [
  {
    allowed: new Set([
      "FeatureCard",
      "FeatureKpiCard",
      "FeatureMetricCard",
      "FeatureStatCard",
    ]),
    suffix: "KpiCard",
    suggestion:
      "compose a shared FeatureKpiCard, FeatureMetricCard, or FeatureStatCard instead of feature-local KPI markup",
  },
];

export function findFeaturePrimitiveViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const imports = collectUiImports(sourceFile);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (isJsxOpening(node)) {
      const tagName = importedFeatureCardName(node, sourceFile, imports);
      if (tagName && !hasExplicitPadding(node, sourceFile)) {
        violations.push({
          line: sourceLine(sourceFile, node),
          name: `${tagName} without an explicit padding prop`,
          suggestion:
            'set padding="none", padding="compact", or padding="comfortable" explicitly',
          verb: "renders",
        });
      }
    }

    const component = componentDeclaration(node);
    if (!component) return;

    const genericSuggestion = genericPrimitiveSuggestions.get(component.name);
    if (genericSuggestion) {
      violations.push({
        line: sourceLine(sourceFile, component.node),
        name: `local generic UI ${component.name}`,
        suggestion: genericSuggestion,
      });
      return;
    }

    const cardRule = composedCardRules.find(({ suffix }) =>
      component.name.endsWith(suffix),
    );
    if (cardRule) {
      const renderedPrimitives = renderedUiPrimitives(
        component.body,
        sourceFile,
        imports,
      );
      if (![...cardRule.allowed].some((name) => renderedPrimitives.has(name))) {
        violations.push({
          line: sourceLine(sourceFile, component.node),
          name: `feature KPI card ${component.name}`,
          suggestion: cardRule.suggestion,
        });
      }
      return;
    }

    const stateRule = composedStateRules.find(({ suffix }) =>
      component.name.endsWith(suffix),
    );
    if (!stateRule) return;

    const renderedPrimitives = renderedUiPrimitives(
      component.body,
      sourceFile,
      imports,
    );
    if ([...stateRule.allowed].some((name) => renderedPrimitives.has(name))) {
      return;
    }

    violations.push({
      line: sourceLine(sourceFile, component.node),
      name: `feature state ${component.name}`,
      suggestion: stateRule.suggestion,
    });
  });

  return violations;
}

export function findFeatureSectionContractViolations(source) {
  const hasSafeDefault =
    /padding\s*===\s*["']default["']\s*&&\s*["'][^"']*\bp(?:[xy]?)-/.test(
      source,
    );
  return hasSafeDefault
    ? []
    : [
        {
          name: "FeatureSection without default inner padding",
          suggestion:
            "map the default padding variant to an explicit padding utility",
        },
      ];
}
