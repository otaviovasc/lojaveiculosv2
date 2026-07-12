import {
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  ts,
  walkTypeScript,
} from "./typescript-source.mjs";

const uiComponents = new Set([
  "Button",
  "Badge",
  "Card",
  "CardHeader",
  "CardContent",
  "CardFooter",
  "CardTitle",
  "CardDescription",
  "Input",
  "Textarea",
  "Checkbox",
  "Switch",
  "Dialog",
  "Drawer",
  "Tooltip",
]);

export function findStyleOverrideViolations(file, source) {
  if (file.includes("apps/web/src/components/ui/")) return [];

  const sourceFile = parseTypeScriptSource(file, source);
  const imports = collectUiPrimitiveImports(sourceFile);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      inspectJsxElement(node);
    }
  });

  return violations;

  function inspectJsxElement(node) {
    const tagName = node.tagName.getText(sourceFile);
    if (!isImportedUiPrimitive(tagName, imports)) return;

    for (const attribute of node.attributes.properties) {
      if (!ts.isJsxAttribute(attribute)) continue;
      const name = propertyNameText(attribute.name);
      if (name !== "className") continue;

      const classNames = extractClassNames(attribute.initializer, sourceFile);
      for (const cls of classNames) {
        const overrideType = isStyleOverrideClass(cls);
        if (overrideType) {
          violations.push({
            tagName,
            cls,
            kind: overrideType,
            line: sourceLine(sourceFile, attribute),
          });
        }
      }
    }
  }
}

function extractClassNames(initializer, sourceFile) {
  if (!initializer) return [];
  if (ts.isStringLiteral(initializer)) {
    return initializer.text.split(/\s+/).filter(Boolean);
  }
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    return stringsFromExpression(initializer.expression)
      .flatMap((value) => value.split(/\s+/))
      .filter(Boolean);
  }
  return [];
}

function stringsFromExpression(expression) {
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (ts.isTemplateExpression(expression)) {
    return [
      expression.head.text,
      ...expression.templateSpans.map((span) => span.literal.text),
    ];
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...stringsFromExpression(expression.whenTrue),
      ...stringsFromExpression(expression.whenFalse),
    ];
  }
  if (ts.isBinaryExpression(expression)) {
    return [
      ...stringsFromExpression(expression.left),
      ...stringsFromExpression(expression.right),
    ];
  }
  if (
    ts.isArrayLiteralExpression(expression) ||
    ts.isCallExpression(expression)
  ) {
    return (
      expression.elements?.flatMap(stringsFromExpression) ??
      expression.arguments.flatMap(stringsFromExpression)
    );
  }
  if (ts.isParenthesizedExpression(expression)) {
    return stringsFromExpression(expression.expression);
  }
  return [];
}

function isStyleOverrideClass(cls) {
  const cleanCls = cls.slice(cls.lastIndexOf(":") + 1).replace(/^!/, "");

  if (/^p(x|y|t|r|b|l)?-(?:\d+(?:\.\d+)?|px|\[.+\])$/.test(cleanCls)) {
    return "padding";
  }
  if (/^rounded(?:-.+)?$/.test(cleanCls)) {
    return "border-radius";
  }
  return null;
}

function collectUiPrimitiveImports(sourceFile) {
  const names = new Set();
  const namespaces = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!isUiModule(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (uiComponents.has(importedName)) names.add(element.name.text);
      }
    }
    if (bindings && ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
    }
  }

  return { names, namespaces };
}

function isImportedUiPrimitive(tagName, imports) {
  if (imports.names.has(tagName)) return true;
  const [namespace, member, extra] = tagName.split(".");
  return (
    !extra &&
    Boolean(namespace && imports.namespaces.has(namespace)) &&
    Boolean(member && uiComponents.has(member))
  );
}

function isUiModule(specifier) {
  return (
    specifier === "@/components/ui" ||
    specifier.startsWith("@/components/ui/") ||
    /(?:^|\/)components\/ui(?:\/|$)/.test(specifier)
  );
}
