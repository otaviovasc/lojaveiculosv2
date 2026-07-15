import { ts, unwrapExpression, walkTypeScript } from "./typescript-source.mjs";

export function isJsxOpening(node) {
  return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
}

export function importedFeatureCardName(node, sourceFile, imports) {
  const tagName = node.tagName.getText(sourceFile);
  if (imports.names.get(tagName) === "FeatureCard") return tagName;

  const [namespace, member, extra] = tagName.split(".");
  return !extra &&
    namespace &&
    imports.namespaces.has(namespace) &&
    member === "FeatureCard"
    ? tagName
    : null;
}

export function hasExplicitPadding(node, sourceFile) {
  return node.attributes.properties.some(
    (property) =>
      ts.isJsxAttribute(property) &&
      property.name.getText(sourceFile) === "padding",
  );
}

export function componentDeclaration(node) {
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

export function collectUiImports(sourceFile) {
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

export function renderedUiPrimitives(body, sourceFile, imports) {
  const rendered = new Set();
  walkTypeScript(body, (node) => {
    if (!isJsxOpening(node)) return;
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

function isUiModule(specifier) {
  return (
    specifier === "@/components/ui" ||
    specifier.startsWith("@/components/ui/") ||
    /(?:^|\/)components\/ui(?:\/|$)/.test(specifier)
  );
}
