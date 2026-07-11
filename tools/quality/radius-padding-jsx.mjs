import { relative } from "node:path";
import ts from "typescript";
import { analyzeClassName } from "./radius-padding-values.mjs";

export function findJsxViolations(file, source, radiusScale, root) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") || file.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const roots = [];
  const stack = [];

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const element = makeElement(node.openingElement, sourceFile, radiusScale);
      appendElement(element);
      stack.push(element);
      ts.forEachChild(node, visit);
      stack.pop();
      return;
    }
    if (ts.isJsxSelfClosingElement(node)) {
      appendElement(makeElement(node, sourceFile, radiusScale));
      return;
    }
    ts.forEachChild(node, visit);
  }

  function appendElement(element) {
    const parent = stack.at(-1);
    if (parent) parent.children.push(element);
    else roots.push(element);
  }

  visit(sourceFile);
  return roots.flatMap((element) => checkElement(file, element, root));
}

function makeElement(node, sourceFile, radiusScale) {
  const className = classNameFromAttributes(node.attributes.properties);
  const line =
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;
  return {
    children: [],
    className,
    line,
    metrics: analyzeClassName(className, radiusScale),
    tag: node.tagName.getText(sourceFile),
  };
}

function classNameFromAttributes(attributes) {
  for (const attribute of attributes) {
    if (
      !ts.isJsxAttribute(attribute) ||
      attribute.name.getText() !== "className"
    ) {
      continue;
    }
    if (!attribute.initializer) return "";
    if (ts.isStringLiteral(attribute.initializer)) {
      return attribute.initializer.text;
    }
    if (
      ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression
    ) {
      return stringsFromExpression(attribute.initializer.expression).join(" ");
    }
  }
  return "";
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

function checkElement(file, parent, root) {
  const current = [];
  const outerRadius = parent.metrics.radius?.px;
  if (Number.isFinite(outerRadius)) {
    for (const child of radiusCandidates(parent)) {
      const offset = offsetFor(parent, child);
      const innerRadius = child.metrics.radius?.px;
      if (offset === null || offset <= 0 || !Number.isFinite(innerRadius)) {
        continue;
      }
      const expectedInner = outerRadius - offset;
      if (expectedInner < 0 || closeEnough(innerRadius, expectedInner)) {
        continue;
      }
      current.push(
        formatViolation(file, parent, child, offset, expectedInner, root),
      );
    }
  }
  return [
    ...current,
    ...parent.children.flatMap((child) => checkElement(file, child, root)),
  ];
}

function radiusCandidates(parent, boundaryParent = parent) {
  const candidates = [];
  for (const child of parent.children) {
    if (child.metrics.radius) candidates.push(child);
    else if (transparentWrapper(child)) {
      candidates.push(...radiusCandidates(child, boundaryParent));
    }
  }
  return candidates.filter((child) => boundaryChild(boundaryParent, child));
}

function transparentWrapper(element) {
  return (
    !element.metrics.radius &&
    element.metrics.paddingPx === null &&
    element.metrics.insetPx === null &&
    !element.metrics.hasSurface
  );
}

function boundaryChild(parent, child) {
  const classes = child.metrics.classes;
  if (classes.has("absolute") || child.metrics.insetPx !== null) return true;
  if (classes.has("flex-1")) return true;
  if (["input", "select", "textarea"].includes(child.tag)) return false;
  return (
    child.tag === "button" &&
    classes.has("w-full") &&
    (parent.metrics.paddingPx ?? Infinity) <= 6
  );
}

function offsetFor(parent, child) {
  if (parent.metrics.paddingPx !== null) return parent.metrics.paddingPx;
  if (child.metrics.classes.has("absolute") && child.metrics.insetPx !== null) {
    return child.metrics.insetPx;
  }
  return null;
}

function formatViolation(file, parent, child, offset, expectedInner, root) {
  return `${relative(root, file)}:${child.line}: <${child.tag}> radius ${px(child.metrics.radius.px)} inside <${parent.tag}> radius ${px(parent.metrics.radius.px)} with ${px(offset)} spacing; expected inner radius ${px(expectedInner)}.`;
}

function closeEnough(actual, expected) {
  return Math.abs(actual - expected) <= 0.5;
}

function px(value) {
  return `${Number(value.toFixed(2))}px`;
}
