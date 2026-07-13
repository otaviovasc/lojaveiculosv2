import {
  expressionPath,
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

const callableWrapperNames = new Set([
  "forwardRef",
  "memo",
  "React.forwardRef",
  "React.memo",
  "React.useCallback",
  "useCallback",
]);

export function findFunctionBlocks(source, file = "source.ts") {
  const sourceFile = parseTypeScriptSource(file, source);
  const blocks = [];

  walkTypeScript(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      blocks.push(
        toFunctionBlock(source, sourceFile, node.name.text, node, node.body),
      );
      return;
    }
    if (ts.isMethodDeclaration(node) && node.body) {
      const name = propertyNameText(node.name);
      if (name)
        blocks.push(toFunctionBlock(source, sourceFile, name, node, node.body));
      return;
    }
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return;
    const callable = callableInitializer(node.initializer);
    if (!callable) return;
    blocks.push(
      toFunctionBlock(source, sourceFile, node.name.text, node, callable.body),
    );
  });

  return blocks;
}

export function findOptionCollections(source) {
  const collections = [];
  const pattern =
    /\b(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\[/g;

  for (const match of source.matchAll(pattern)) {
    const openingBracket = match.index + match[0].lastIndexOf("[");
    const closingBracket = findMatchingToken(source, openingBracket, "[", "]");
    if (closingBracket === -1) continue;

    collections.push({
      body: source.slice(openingBracket, closingBracket + 1),
      line: lineNumberAt(source, match.index),
      name: match[1],
    });
  }

  return collections;
}

export function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function callableInitializer(initializer) {
  if (!initializer) return null;
  const current = unwrapExpression(initializer);
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return current;
  }
  if (!ts.isCallExpression(current)) return null;
  const wrapperName = expressionPath(current.expression);
  if (!wrapperName || !callableWrapperNames.has(wrapperName)) return null;
  for (let index = current.arguments.length - 1; index >= 0; index -= 1) {
    const callable = callableInitializer(current.arguments[index]);
    if (callable) return callable;
  }
  return null;
}

function toFunctionBlock(source, sourceFile, name, node, body) {
  const start = body.getStart(sourceFile);
  const end = body.getEnd();
  return {
    body: ts.isBlock(body)
      ? source.slice(start + 1, Math.max(start + 1, end - 1))
      : source.slice(start, end),
    line: sourceLine(sourceFile, node),
    name,
  };
}

function findMatchingToken(source, start, openToken, closeToken) {
  let depth = 0;
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const previous = source[index - 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openToken) depth += 1;
    if (char === closeToken) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}
