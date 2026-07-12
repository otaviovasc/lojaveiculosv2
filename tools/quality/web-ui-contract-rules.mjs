import {
  expressionPath,
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  staticString,
  ts,
  walkTypeScript,
} from "./typescript-source.mjs";

export const webUiContractMessages = {
  "dangerous-html": {
    label: "dangerous HTML injection",
    suggestion:
      "Use typed structured content or a reviewed sanitizer wrapper before rendering HTML.",
  },
  "javascript-href": {
    label: "javascript href",
    suggestion: "Use a real route, button action, or safe event handler.",
  },
  "native-date-input": {
    label: "native date input",
    suggestion: "Use the shared DatePickerField used by DashboardHome.",
  },
  "native-select": {
    label: "native <select>",
    suggestion:
      "Use FeatureSelect, CrmSelect, InventorySelect, or another CustomSelect wrapper.",
  },
  "native-warning": {
    label: "native browser warning",
    suggestion: "Use FeatureDialog, ConfirmDialog, or visible feature state.",
  },
  "button-color-shadow": {
    label: "colored shadow on static button state",
    suggestion:
      "Buttons cannot use colored shadows on their base static state. Use color shadows only on interactive states (e.g. hover, focus, active).",
  },
};

const warningCalls = new Set([
  "alert",
  "confirm",
  "prompt",
  "globalThis.alert",
  "globalThis.confirm",
  "globalThis.prompt",
  "window.alert",
  "window.confirm",
  "window.prompt",
]);

export function findWebUiContractViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      inspectJsxElement(node);
    }
    if (
      ts.isCallExpression(node) &&
      warningCalls.has(expressionPath(node.expression))
    ) {
      add("native-warning", node);
    }
  });

  return violations;

  function inspectJsxElement(node) {
    const tagName = node.tagName.getText(sourceFile);
    if (tagName === "select") {
      add("native-select", node);
    }

    const isButton =
      tagName === "button" ||
      tagName === "Button" ||
      tagName === "a" ||
      tagName === "Link";

    for (const attribute of node.attributes.properties) {
      if (!ts.isJsxAttribute(attribute)) continue;
      const name = propertyNameText(attribute.name);
      const value = jsxAttributeValue(attribute);
      if (name === "type" && value?.toLowerCase() === "date") {
        add("native-date-input", attribute);
      }
      if (name === "dangerouslySetInnerHTML") {
        add("dangerous-html", attribute);
      }
      if (name === "href" && /^\s*javascript:/i.test(value ?? "")) {
        add("javascript-href", attribute);
      }
      if (isButton && name === "className") {
        const classNames = extractClassNames(attribute.initializer);
        const statePrefixes =
          /^(?:hover|focus|active|group-hover|group-focus|group-active|peer-hover|peer-focus|peer-active|focus-visible|focus-within|disabled|dark|motion-safe|motion-reduce):/;
        for (const cls of classNames) {
          if (!statePrefixes.test(cls)) {
            if (/shadow-\[.*(?:color|rgb|hsl|okl|#)/i.test(cls)) {
              add("button-color-shadow", attribute);
              break;
            }
          }
        }
      }
    }
  }

  function add(kind, node) {
    violations.push({ kind, line: sourceLine(sourceFile, node) });
  }
}

function jsxAttributeValue(attribute) {
  if (!attribute.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer))
    return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) {
    return staticString(attribute.initializer.expression);
  }
  return null;
}

function extractClassNames(initializer) {
  if (!initializer) return [];
  if (ts.isStringLiteral(initializer)) {
    return initializer.text.split(/\s+/).filter(Boolean);
  }
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    return stringsFromExpression(initializer.expression)
      .flatMap((s) => s.split(/\s+/))
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
