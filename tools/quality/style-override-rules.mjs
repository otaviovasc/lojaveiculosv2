import {
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

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
      if (name === "className") {
        addClassNameViolations(attribute, tagName);
      }
      if (name === "style") {
        addInlineStyleViolations(attribute, tagName);
      }
    }
  }

  function addClassNameViolations(attribute, tagName) {
    const classNames = extractClassNames(attribute.initializer, sourceFile);
    for (const cls of classNames) {
      const overrideType = isStyleOverrideClass(cls);
      if (!overrideType) continue;
      violations.push({
        tagName,
        cls,
        kind: overrideType,
        line: sourceLine(sourceFile, attribute),
      });
    }
  }

  function addInlineStyleViolations(attribute, tagName) {
    for (const override of extractInlineStyleOverrides(attribute.initializer)) {
      violations.push({
        tagName,
        cls: `style.${override.property}`,
        kind: override.kind,
        line: sourceLine(sourceFile, attribute),
      });
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

function extractInlineStyleOverrides(initializer) {
  if (!initializer || !ts.isJsxExpression(initializer)) return [];
  const expression = initializer.expression
    ? unwrapExpression(initializer.expression)
    : null;
  if (!expression || !ts.isObjectLiteralExpression(expression)) return [];
  const overrides = [];
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyNameText(property.name);
    if (!name) continue;
    if (/^padding(?:Top|Right|Bottom|Left)?$/.test(name)) {
      overrides.push({ kind: "padding", property: name });
    }
    if (name === "borderRadius") {
      overrides.push({ kind: "border-radius", property: name });
    }
  }
  return overrides;
}

function collectUiPrimitiveImports(sourceFile) {
  const names = new Set();
  const namespaces = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!isUiModule(statement.moduleSpecifier.text)) continue;
    const defaultImport = statement.importClause?.name;
    if (defaultImport && /^[A-Z]/.test(defaultImport.text)) {
      names.add(defaultImport.text);
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (/^[A-Z]/.test(importedName)) names.add(element.name.text);
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
    Boolean(member && /^[A-Z]/.test(member))
  );
}

function isUiModule(specifier) {
  return (
    specifier === "@/components/ui" ||
    specifier.startsWith("@/components/ui/") ||
    /(?:^|\/)components\/ui(?:\/|$)/.test(specifier)
  );
}
