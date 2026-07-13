import {
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  staticString,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

export function findFeatureOverlayViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
      return;
    }
    const tagName = node.tagName.getText(sourceFile);
    if (!/^[a-z]/.test(tagName)) return;

    if (tagName === "dialog" || jsxAttribute(node, "role") === "dialog") {
      violations.push({
        kind: "raw dialog element",
        line: sourceLine(sourceFile, node),
      });
      return;
    }

    const classes = classNames(node, sourceFile);
    if (isRawFullscreenOverlay(classes)) {
      violations.push({
        kind: "raw fixed overlay",
        line: sourceLine(sourceFile, node),
      });
    }
  });

  return violations;
}

function isOverlayZIndex(className) {
  return /^z-(?:[4-9]\d|[1-9]\d{2,}|\[)/.test(utilityName(className));
}

function isRawFullscreenOverlay(classes) {
  const utilities = new Set(classes.map(utilityName));
  const coversViewport =
    utilities.has("inset-0") ||
    (utilities.has("inset-x-0") && utilities.has("inset-y-0")) ||
    ["top-0", "right-0", "bottom-0", "left-0"].every((name) =>
      utilities.has(name),
    ) ||
    (utilities.has("top-0") &&
      utilities.has("left-0") &&
      utilities.has("h-screen") &&
      utilities.has("w-screen"));
  return (
    utilities.has("fixed") && coversViewport && classes.some(isOverlayZIndex)
  );
}

function utilityName(className) {
  return className.slice(className.lastIndexOf(":") + 1).replace(/^!/, "");
}

function jsxAttribute(node, expectedName) {
  for (const attribute of node.attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue;
    if (propertyNameText(attribute.name) !== expectedName) continue;
    return staticString(attribute.initializer);
  }
  return null;
}

function classNames(node, sourceFile) {
  for (const attribute of node.attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue;
    if (propertyNameText(attribute.name) !== "className") continue;
    return stringsFromInitializer(attribute.initializer, sourceFile)
      .flatMap((value) => value.split(/\s+/))
      .filter(Boolean);
  }
  return [];
}

function stringsFromInitializer(initializer, sourceFile) {
  if (!initializer) return [];
  if (ts.isStringLiteral(initializer)) return [initializer.text];
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return [];
  return stringsFromExpression(initializer.expression, sourceFile);
}

function stringsFromExpression(expression, sourceFile) {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) return [current.text];
  if (ts.isTemplateExpression(current)) {
    return [
      current.head.text,
      ...current.templateSpans.map((span) => span.literal.text),
    ];
  }
  if (ts.isConditionalExpression(current)) {
    return [
      ...stringsFromExpression(current.whenTrue, sourceFile),
      ...stringsFromExpression(current.whenFalse, sourceFile),
    ];
  }
  if (ts.isBinaryExpression(current)) {
    return [
      ...stringsFromExpression(current.left, sourceFile),
      ...stringsFromExpression(current.right, sourceFile),
    ];
  }
  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.flatMap((element) =>
      stringsFromExpression(element, sourceFile),
    );
  }
  if (ts.isCallExpression(current)) {
    return current.arguments.flatMap((argument) =>
      stringsFromExpression(argument, sourceFile),
    );
  }
  return [];
}
