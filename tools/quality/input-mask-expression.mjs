import { ts, unwrapExpression } from "./typescript-source.mjs";
import {
  dependsOnInput,
  isSelectedPixCategory,
} from "./input-mask-data-flow.mjs";
import { maskKindForReference } from "./input-mask-source.mjs";

export function expressionProducesMask(
  expression,
  kind,
  references,
  seen = new Set(),
  inputNames = null,
) {
  const current = unwrapExpression(expression);
  if (isExpectedMaskCall(current, kind, references, inputNames)) return true;
  if (ts.isIdentifier(current) && references.nodes.has(current.text)) {
    if (seen.has(current.text)) return false;
    seen.add(current.text);
    return expressionProducesMask(
      references.nodes.get(current.text),
      kind,
      references,
      seen,
      inputNames,
    );
  }
  if (ts.isCallExpression(current)) {
    return current.arguments.some((argument) =>
      expressionProducesMask(
        argument,
        kind,
        references,
        new Set(seen),
        inputNames,
      ),
    );
  }
  if (ts.isConditionalExpression(current)) {
    return [current.whenTrue, current.whenFalse].every((branch) =>
      expressionProducesMask(
        branch,
        kind,
        references,
        new Set(seen),
        inputNames,
      ),
    );
  }
  if (ts.isBinaryExpression(current)) {
    const operands = binaryOutputOperands(current);
    const predicate = isLogicalOperator(current.operatorToken.kind)
      ? "every"
      : "some";
    return operands[predicate]((operand) =>
      expressionProducesMask(
        operand,
        kind,
        references,
        new Set(seen),
        inputNames,
      ),
    );
  }
  if (ts.isTemplateExpression(current)) {
    return current.templateSpans.some((span) =>
      expressionProducesMask(
        span.expression,
        kind,
        references,
        new Set(seen),
        inputNames,
      ),
    );
  }
  return false;
}

export function isExpectedMaskCall(node, kind, references, inputNames) {
  if (
    !ts.isCallExpression(node) ||
    maskKindForReference(node.expression, references) !== kind ||
    !node.arguments[0]
  ) {
    return false;
  }
  if (
    inputNames &&
    !dependsOnInput(node.arguments[0], inputNames, references, new Set())
  ) {
    return false;
  }
  return kind !== "pix-key" || isSelectedPixCategory(node.arguments[1]);
}

function binaryOutputOperands(node) {
  return node.operatorToken.kind === ts.SyntaxKind.CommaToken
    ? [node.right]
    : [node.left, node.right];
}

function isLogicalOperator(kind) {
  return (
    kind === ts.SyntaxKind.AmpersandAmpersandToken ||
    kind === ts.SyntaxKind.BarBarToken ||
    kind === ts.SyntaxKind.QuestionQuestionToken
  );
}
