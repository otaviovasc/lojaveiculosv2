import ts from "typescript";

export { ts };

export function parseTypeScriptSource(file, source) {
  return ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
}

export function walkTypeScript(node, visitor) {
  visitor(node);
  ts.forEachChild(node, (child) => walkTypeScript(child, visitor));
}

export function sourceLine(sourceFile, node) {
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
  );
}

export function unwrapExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

export function staticString(node) {
  if (!node) return null;
  const current = unwrapExpression(node);
  if (ts.isStringLiteralLike(current)) return current.text;
  if (ts.isJsxExpression(current)) return staticString(current.expression);
  return null;
}

export function propertyNameText(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name)) return staticString(name.expression);
  return null;
}

export function expressionPath(node) {
  if (!node) return null;
  const current = unwrapExpression(node);
  if (ts.isIdentifier(current)) return current.text;
  if (current.kind === ts.SyntaxKind.ThisKeyword) return "this";
  if (ts.isPropertyAccessExpression(current)) {
    const parent = expressionPath(current.expression);
    return parent ? `${parent}.${current.name.text}` : null;
  }
  if (ts.isElementAccessExpression(current)) {
    const parent = expressionPath(current.expression);
    const property = staticString(current.argumentExpression);
    return parent && property ? `${parent}.${property}` : null;
  }
  return null;
}

export function collectModuleSpecifiers(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const specifiers = [];

  walkTypeScript(sourceFile, (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      addSpecifier(node.moduleSpecifier);
      return;
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      addSpecifier(node.moduleReference.expression);
      return;
    }
    if (!ts.isCallExpression(node) || node.arguments.length !== 1) return;
    const isDynamicImport =
      node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const isRequire = expressionPath(node.expression) === "require";
    if (isDynamicImport || isRequire) addSpecifier(node.arguments[0]);
  });

  return specifiers;

  function addSpecifier(node) {
    const specifier = staticString(node);
    if (specifier === null) return;
    specifiers.push({ line: sourceLine(sourceFile, node), specifier });
  }
}

function scriptKind(file) {
  if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/i.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
