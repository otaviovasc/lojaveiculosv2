export function findFunctionBlocks(source) {
  return [
    ...findBlocks(
      source,
      /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>{}]*>)?\s*\([^)]*\)\s*(?::[^{=]+)?\{/g,
    ),
    ...findBlocks(
      source,
      /\b(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=>\s*\{/g,
    ),
  ];
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

function findBlocks(source, pattern) {
  const blocks = [];
  for (const match of source.matchAll(pattern)) {
    const openingBrace = match.index + match[0].lastIndexOf("{");
    const closingBrace = findMatchingToken(source, openingBrace, "{", "}");
    if (closingBrace === -1) continue;

    blocks.push({
      body: source.slice(openingBrace + 1, closingBrace),
      line: lineNumberAt(source, match.index),
      name: match[1],
    });
  }

  return blocks;
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
