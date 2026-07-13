import {
  parseTypeScriptSource,
  sourceLine,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

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

export function findFeaturePrimitiveViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const imports = collectUiImports(sourceFile);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
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

function componentDeclaration(node) {
  if (ts.isFunctionDeclaration(node) && node.name && node.body) {
    return uppercaseComponent(node.name.text, node, node.body);
  }
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
    return null;
  }
  if (!node.initializer) return null;
  const initializer = componentFunction(node.initializer);
  return initializer
    ? uppercaseComponent(node.name.text, node, initializer.body)
    : null;
}

function componentFunction(expression) {
  const candidate = unwrapExpression(expression);
  if (ts.isArrowFunction(candidate) || ts.isFunctionExpression(candidate)) {
    return candidate;
  }
  if (!ts.isCallExpression(candidate)) return null;
  const callback = candidate.arguments[0];
  return callback ? componentFunction(callback) : null;
}

function uppercaseComponent(name, node, body) {
  return /^[A-Z]/.test(name) ? { body, name, node } : null;
}

function collectUiImports(sourceFile) {
  const names = new Map();
  const namespaces = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!isUiModule(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.set(
          element.name.text,
          element.propertyName?.text ?? element.name.text,
        );
      }
    }
    if (bindings && ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
    }
  }
  return { names, namespaces };
}

function renderedUiPrimitives(body, sourceFile, imports) {
  const rendered = new Set();
  walkTypeScript(body, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
      return;
    }
    const tagName = node.tagName.getText(sourceFile);
    const importedName = imports.names.get(tagName);
    if (importedName) rendered.add(importedName);
    const [namespace, member, extra] = tagName.split(".");
    if (!extra && namespace && imports.namespaces.has(namespace) && member) {
      rendered.add(member);
    }
  });
  return rendered;
}

function isUiModule(specifier) {
  return (
    specifier === "@/components/ui" ||
    specifier.startsWith("@/components/ui/") ||
    /(?:^|\/)components\/ui(?:\/|$)/.test(specifier)
  );
}
