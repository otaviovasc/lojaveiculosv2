import { expressionPath, ts, unwrapExpression } from "./typescript-source.mjs";

export function dependsOnInput(node, inputNames, references, seen) {
  const current = unwrapExpression(node);
  if (ts.isIdentifier(current)) {
    if (inputNames.has(current.text)) return true;
    if (seen.has(current.text) || !references.nodes.has(current.text)) {
      return false;
    }
    seen.add(current.text);
    return dependsOnInput(
      references.nodes.get(current.text),
      inputNames,
      references,
      seen,
    );
  }
  if (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current)
  ) {
    return dependsOnInput(
      current.expression,
      inputNames,
      references,
      new Set(seen),
    );
  }
  if (ts.isCallExpression(current)) {
    return current.arguments.some((argument) =>
      dependsOnInput(argument, inputNames, references, new Set(seen)),
    );
  }
  let found = false;
  ts.forEachChild(current, (child) => {
    if (
      !found &&
      dependsOnInput(child, inputNames, references, new Set(seen))
    ) {
      found = true;
    }
  });
  return found;
}

export function isSelectedPixCategory(node) {
  if (!node || ts.isStringLiteralLike(unwrapExpression(node))) return false;
  const path = expressionPath(node);
  const terminal = path?.split(".").at(-1)?.toLowerCase();
  if (
    ["cpf", "cnpj", "celular", "email", "random", "aleatoria"].includes(
      terminal,
    )
  ) {
    return false;
  }
  const text = node
    .getText()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return /\b(?:pix\s+)?(?:category|categoria|type|tipo|kind)\b|\b(?:category|categoria|type|tipo|kind)\s+(?:pix|key|chave)\b/.test(
    text,
  );
}

export function isEditedInputTarget(node, inputNames, references, seen) {
  const current = unwrapExpression(node);
  if (ts.isIdentifier(current)) {
    if (
      inputNames.has(current.text) &&
      /^(?:currentTarget|target)$/.test(current.text)
    ) {
      return true;
    }
    if (seen.has(current.text) || !references.nodes.has(current.text)) {
      return false;
    }
    seen.add(current.text);
    return isEditedInputTarget(
      references.nodes.get(current.text),
      inputNames,
      references,
      seen,
    );
  }
  const parts = expressionPath(current)?.split(".");
  return (
    parts?.length === 2 &&
    inputNames.has(parts[0]) &&
    /^(?:currentTarget|target)$/.test(parts[1])
  );
}

export function maskCallCoversBranches(call, handler, isMaskedExpression) {
  let current = call;
  while (current.parent && current.parent !== handler) {
    const parent = current.parent;
    if (
      ts.isConditionalExpression(parent) &&
      (!isMaskedExpression(parent.whenTrue) ||
        !isMaskedExpression(parent.whenFalse))
    ) {
      return false;
    }
    if (
      ts.isBinaryExpression(parent) &&
      isLogicalOperator(parent.operatorToken.kind) &&
      (!isMaskedExpression(parent.left) || !isMaskedExpression(parent.right))
    ) {
      return false;
    }
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.CommaToken &&
      !nodeContains(parent.right, call)
    ) {
      return false;
    }
    current = parent;
  }
  return true;
}

export function maskResultFlows(call, handler, acceptSink) {
  let current = call;
  while (current.parent && current.parent !== handler) {
    const parent = current.parent;
    if (ts.isReturnStatement(parent)) {
      return acceptSink ? expressionIsSink(parent.expression, call) : true;
    }
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return variableFlowsToSink(parent.name.text, handler, acceptSink, parent);
    }
    if (ts.isExpressionStatement(parent)) {
      return acceptSink && expressionIsSink(parent.expression, call);
    }
    current = parent;
  }
  if (!ts.isArrowFunction(handler) || handler.body !== current) return false;
  return acceptSink ? expressionIsSink(current, call) : true;
}

export function collectBindingNames(parameters) {
  const names = new Set();
  for (const parameter of parameters) collectName(parameter.name, names);
  return names;
}

export function visitFunctionBody(handler, visitor) {
  const visit = (node) => {
    visitor(node);
    ts.forEachChild(node, (child) => {
      if (child !== handler && isFunctionLike(child)) return;
      visit(child);
    });
  };
  visit(handler.body);
}

export function isFunctionLike(node) {
  return (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node)
  );
}

function variableFlowsToSink(name, handler, acceptSink, declaration) {
  let found = false;
  visitFunctionBody(handler, (node) => {
    if (
      found ||
      node === declaration ||
      !ts.isIdentifier(node) ||
      node.text !== name
    ) {
      return;
    }
    let current = node;
    while (current.parent && current.parent !== handler) {
      if (ts.isReturnStatement(current.parent)) found = true;
      if (acceptSink && ts.isExpressionStatement(current.parent)) {
        found = expressionIsSink(current.parent.expression, node);
      }
      if (found) return;
      current = current.parent;
    }
  });
  return found;
}

function expressionIsSink(expression, needle) {
  const root = unwrapExpression(expression);
  if (
    ts.isBinaryExpression(root) &&
    root.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    root.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  ) {
    return nodeContains(root.right, needle);
  }
  if (
    !ts.isCallExpression(root) ||
    !root.arguments.some((argument) => nodeContains(argument, needle))
  ) {
    return false;
  }
  const callee = root.expression.getText();
  return /(?:^|[.(])(?:set|update|on[A-Za-z0-9_$]*Change|handle[A-Za-z0-9_$]*Change|dispatch|patch|assign|write|mutate|emit)[A-Za-z0-9_$]*/.test(
    callee,
  );
}

function nodeContains(root, target) {
  if (root === target) return true;
  let found = false;
  ts.forEachChild(root, (child) => {
    if (!found && nodeContains(child, target)) found = true;
  });
  return found;
}

function isLogicalOperator(kind) {
  return (
    kind === ts.SyntaxKind.AmpersandAmpersandToken ||
    kind === ts.SyntaxKind.BarBarToken ||
    kind === ts.SyntaxKind.QuestionQuestionToken
  );
}

function collectName(name, names) {
  if (ts.isIdentifier(name)) names.add(name.text);
  else {
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) collectName(element.name, names);
    }
  }
}
