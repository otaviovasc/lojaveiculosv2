import {
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

const actionNamePattern =
  /(?:^|[-_])(?:action|btn|button|choice|control|download|option|tab|toggle|trigger)(?:$|--)/i;

export function collectActionClassNames(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const classNames = new Set();

  walkTypeScript(sourceFile, (node) => {
    if (!isJsxElement(node) || !isActionTag(node.tagName.getText(sourceFile))) {
      return;
    }
    for (const attribute of node.attributes.properties) {
      if (
        ts.isJsxAttribute(attribute) &&
        propertyNameText(attribute.name) === "className"
      ) {
        for (const className of extractClassNames(attribute.initializer)) {
          classNames.add(className.slice(className.lastIndexOf(":") + 1));
        }
      }
    }
  });

  return classNames;
}

export function findJsxButtonShadowViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (!isJsxElement(node) || !isActionTag(node.tagName.getText(sourceFile))) {
      return;
    }
    for (const attribute of node.attributes.properties) {
      if (!ts.isJsxAttribute(attribute)) continue;
      const name = propertyNameText(attribute.name);
      if (name === "className") {
        for (const className of extractClassNames(attribute.initializer)) {
          if (isForbiddenShadowClass(className)) {
            violations.push({
              detail: `decorative shadow class ${JSON.stringify(className)}`,
              file,
              line: sourceLine(sourceFile, attribute),
            });
          }
        }
      }
      if (name === "style" && hasInlineBoxShadow(attribute.initializer)) {
        violations.push({
          detail: "inline style.boxShadow",
          file,
          line: sourceLine(sourceFile, attribute),
        });
      }
    }
  });

  return violations;
}

export function findCssButtonShadowViolations(
  file,
  source,
  actionClassNames = new Set(),
) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const violations = [];

  for (const match of clean.matchAll(/([^{}@][^{}]*)\{([^{}]*)\}/g)) {
    const selectors = match[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);
    const shadow = declarationValue(match[2], "box-shadow");
    if (!shadow || !selectors.some((selector) => isActionSelector(selector))) {
      continue;
    }
    if (isAllowedShadow(selectors, shadow)) continue;

    violations.push({
      detail: `box-shadow ${JSON.stringify(shadow)} on ${selectors.join(", ")}`,
      file,
      line: clean.slice(0, match.index).split("\n").length,
    });
  }

  return violations;

  function isActionSelector(selector) {
    if (/\bbutton\b|\[role\s*=\s*["']?button/i.test(selector)) return true;
    return [...selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)].some((classMatch) => {
      const className = classMatch[1];
      return (
        actionClassNames.has(className) || actionNamePattern.test(className)
      );
    });
  }
}

function isJsxElement(node) {
  return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node);
}

function isActionTag(tagName) {
  return (
    ["a", "button", "Link"].includes(tagName) ||
    /(?:Action|Button|Choice|Control|Link|Option|Tab|Toggle|Trigger)$/.test(
      tagName,
    )
  );
}

function extractClassNames(initializer) {
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
  const node = unwrapExpression(expression);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isTemplateExpression(node)) {
    return [
      node.head.text,
      ...node.templateSpans.map((span) => span.literal.text),
    ];
  }
  if (ts.isConditionalExpression(node)) {
    return [
      ...stringsFromExpression(node.whenTrue),
      ...stringsFromExpression(node.whenFalse),
    ];
  }
  if (ts.isBinaryExpression(node)) {
    return [
      ...stringsFromExpression(node.left),
      ...stringsFromExpression(node.right),
    ];
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap(stringsFromExpression);
  }
  if (ts.isCallExpression(node)) {
    return node.arguments.flatMap(stringsFromExpression);
  }
  return [];
}

function isForbiddenShadowClass(className) {
  const utility = className.slice(className.lastIndexOf(":") + 1);
  if (utility === "shadow-none" || utility === "!shadow-none") return false;
  if (!/^!?(?:shadow(?:-.+)?|drop-shadow(?:-.+)?)$/.test(utility)) {
    return false;
  }
  return !/^(?:focus|focus-visible):shadow-\[var\(--shadow-focus\)\]$/.test(
    className,
  );
}

function hasInlineBoxShadow(initializer) {
  if (!initializer || !ts.isJsxExpression(initializer)) return false;
  const expression = initializer.expression
    ? unwrapExpression(initializer.expression)
    : null;
  if (!expression || !ts.isObjectLiteralExpression(expression)) return false;
  return expression.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      propertyNameText(property.name) === "boxShadow",
  );
}

function declarationValue(declarations, property) {
  const match = new RegExp(`${property}\\s*:\\s*([^;]+)`, "i").exec(
    declarations,
  );
  return match?.[1]?.trim() ?? null;
}

function isAllowedShadow(selectors, shadow) {
  if (/^none(?:\s*!important)?$/i.test(shadow)) return true;
  const focusOnly = selectors.every((selector) =>
    /:(?:focus|focus-visible|focus-within)(?!-)/.test(selector),
  );
  return focusOnly && /^var\(--shadow-focus\)(?:\s*!important)?$/i.test(shadow);
}
