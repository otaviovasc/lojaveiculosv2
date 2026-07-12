import {
  expressionPath,
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

export function findApiErrorEnvelopeViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (ts.isCallExpression(node)) inspectJsonCall(node);
    if (ts.isBinaryExpression(node)) inspectContextErrorAssignment(node);
  });

  return violations;

  function inspectJsonCall(node) {
    const callPath = expressionPath(node.expression);
    if (!callPath?.endsWith(".json")) return;
    const payload = objectLiteral(node.arguments[0]);
    if (!payload) return;

    const keys = new Set(
      payload.properties.map((property) => propertyNameText(property.name)),
    );
    const forbiddenKeys = ["message", "error"].filter((key) => keys.has(key));
    if (forbiddenKeys.length === 0) return;

    const helper =
      callPath === "Response.json" ? "Response.json(...)" : ".json(...)";
    violations.push({
      kind: "direct-json-error",
      line: sourceLine(sourceFile, node),
      message: `use jsonApiError(...) instead of ${helper} with ${forbiddenKeys.map((key) => `{ ${key} }`).join(" or ")}`,
    });
  }

  function inspectContextErrorAssignment(node) {
    if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    if (expressionPath(node.left) !== "context.error") return;
    violations.push({
      kind: "context-error-assignment",
      line: sourceLine(sourceFile, node),
      message: "set context.error through jsonApiError(...) metadata handling",
    });
  }
}

function objectLiteral(node) {
  if (!node) return null;
  const current = unwrapExpression(node);
  return ts.isObjectLiteralExpression(current) ? current : null;
}
