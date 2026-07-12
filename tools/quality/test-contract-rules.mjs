import {
  expressionPath,
  parseTypeScriptSource,
  sourceLine,
  staticString,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

const testApis = new Set(["bench", "describe", "it", "suite", "test"]);
const disabledModifiers = new Set(["only", "skip", "todo"]);
const disabledAliases = new Set([
  "fdescribe",
  "fit",
  "ftest",
  "xdescribe",
  "xit",
  "xtest",
]);
const equalityMatchers = new Set(["toBe", "toEqual", "toStrictEqual"]);
const expectApis = new Set(["expect", "expect.soft"]);

export function findDisabledTestViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    const callPath = testExpressionPath(node.expression);
    if (!callPath) return;
    const parts = callPath.split(".");
    const root = parts[0];
    const alias = parts.length === 1 && disabledAliases.has(root);
    const modifier = testApis.has(root)
      ? parts.find((part, index) => index > 0 && disabledModifiers.has(part))
      : null;
    if (!alias && !modifier) return;
    violations.push({
      callPath,
      line: sourceLine(sourceFile, node),
      modifier: alias ? root : modifier,
    });
  });

  return violations;
}

export function findTautologicalAssertionViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length !== 1) return;
    const matcherAccess = unwrapExpression(node.expression);
    if (
      !ts.isPropertyAccessExpression(matcherAccess) &&
      !ts.isElementAccessExpression(matcherAccess)
    ) {
      return;
    }
    const matcher = ts.isPropertyAccessExpression(matcherAccess)
      ? matcherAccess.name.text
      : staticString(matcherAccess.argumentExpression);
    if (!equalityMatchers.has(matcher)) return;

    const expectation = unwrapExpression(matcherAccess.expression);
    if (
      !ts.isCallExpression(expectation) ||
      !expectApis.has(expressionPath(expectation.expression)) ||
      expectation.arguments.length !== 1
    ) {
      return;
    }

    const received = staticPrimitiveKey(expectation.arguments[0]);
    const expected = staticPrimitiveKey(node.arguments[0]);
    if (received === null || expected === null || received !== expected) return;

    violations.push({
      line: sourceLine(sourceFile, node),
      matcher,
    });
  });

  return violations;
}

function staticPrimitiveKey(node) {
  const current = unwrapExpression(node);
  if (ts.isStringLiteralLike(current)) return `string:${current.text}`;
  if (ts.isNumericLiteral(current)) return numericKey(current.text);
  if (ts.isBigIntLiteral(current)) {
    return `bigint:${BigInt(current.text.slice(0, -1))}`;
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword) return "boolean:true";
  if (current.kind === ts.SyntaxKind.FalseKeyword) return "boolean:false";
  if (current.kind === ts.SyntaxKind.NullKeyword) return "null";
  if (!ts.isPrefixUnaryExpression(current)) return null;
  if (
    current.operator !== ts.SyntaxKind.MinusToken &&
    current.operator !== ts.SyntaxKind.PlusToken
  ) {
    return null;
  }
  const operand = unwrapExpression(current.operand);
  const sign = current.operator === ts.SyntaxKind.MinusToken ? -1 : 1;
  if (ts.isNumericLiteral(operand)) {
    return numericKey(String(sign * Number(operand.text)));
  }
  if (ts.isBigIntLiteral(operand)) {
    return `bigint:${BigInt(sign) * BigInt(operand.text.slice(0, -1))}`;
  }
  return null;
}

function numericKey(source) {
  const value = Number(source);
  return `number:${Object.is(value, -0) ? "-0" : value}`;
}

function testExpressionPath(node) {
  if (!node) return null;
  const current = unwrapExpression(node);
  if (ts.isIdentifier(current)) return current.text;
  if (ts.isPropertyAccessExpression(current)) {
    const parent = testExpressionPath(current.expression);
    return parent ? `${parent}.${current.name.text}` : null;
  }
  if (ts.isElementAccessExpression(current)) {
    const parent = testExpressionPath(current.expression);
    const property = staticString(current.argumentExpression);
    return parent && property ? `${parent}.${property}` : null;
  }
  if (ts.isCallExpression(current))
    return testExpressionPath(current.expression);
  if (ts.isTaggedTemplateExpression(current)) {
    return testExpressionPath(current.tag);
  }
  return expressionPath(current);
}

export function findWorkspaceTestViolations(input) {
  const {
    packageFile,
    packageSource,
    requireAssertions,
    runtimeFiles,
    testFiles,
  } = input;
  let manifest;
  try {
    manifest = JSON.parse(packageSource);
  } catch {
    return [`${packageFile}: package.json is not valid JSON`];
  }

  const failures = [];
  if (runtimeFiles.length === 0) return failures;
  if (requireAssertions !== true) {
    failures.push(
      `${packageFile}: Vitest must require at least one assertion per test`,
    );
  }
  const testScript = manifest.scripts?.test;
  if (typeof testScript !== "string" || testScript.trim() === "") {
    failures.push(`${packageFile}: runtime workspace must expose scripts.test`);
  } else {
    if (/--passWithNoTests\b/.test(testScript)) {
      failures.push(
        `${packageFile}: test script must not use --passWithNoTests`,
      );
    }
    if (/^\s*(?:echo\b|exit\s+0\b|true\s*$)/.test(testScript)) {
      failures.push(`${packageFile}: test script must run a real test runner`);
    }
    if (
      !/\b(?:vitest|jest|playwright\s+test)\b|\bnode\s+--test\b/.test(
        testScript,
      )
    ) {
      failures.push(
        `${packageFile}: test script must use a supported test runner`,
      );
    }
    if (
      /\.(?:test|spec)\.[cm]?[jt]sx?\b|--(?:changed|related)\b/i.test(
        testScript,
      )
    ) {
      failures.push(`${packageFile}: test script must not focus a test subset`);
    }
  }
  if (testFiles.length === 0) {
    failures.push(
      `${packageFile}: runtime workspace must contain a test/spec file`,
    );
  }
  return failures;
}

export function isTestFile(file) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file);
}
