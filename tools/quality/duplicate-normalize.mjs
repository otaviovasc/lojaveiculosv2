import {
  cloneWindowStride,
  minimumCloneWindowLines,
  minimumCloneWindowTokens,
  minimumImplementationLength,
  minimumImplementationLines,
  minimumImplementationTokens,
  minimumOptionItems,
  minimumOptionLength,
} from "./duplicate-config.mjs";

export function shouldTrackImplementation(block) {
  if (block.body.split("\n").length < minimumImplementationLines) return false;
  if (block.key.length < minimumImplementationLength) return false;
  return tokenCount(block.key) >= minimumImplementationTokens;
}

export function shouldTrackOptionCollection(collection) {
  if (collection.key.length < minimumOptionLength) return false;
  return countOptionItems(collection.body) >= minimumOptionItems;
}

export function findCloneWindows(block) {
  const tokens = tokenizeForCloneDetection(block.body, block.line);
  if (tokens.length < minimumCloneWindowTokens) return [];

  const windows = [];
  for (
    let index = 0;
    index <= tokens.length - minimumCloneWindowTokens;
    index += cloneWindowStride
  ) {
    const slice = tokens.slice(index, index + minimumCloneWindowTokens);
    const startLine = slice[0].line;
    const endLine = slice[slice.length - 1].line;
    if (endLine - startLine + 1 < minimumCloneWindowLines) continue;

    windows.push({
      endLine,
      file: block.file,
      key: slice.map((token) => token.value).join(" "),
      line: startLine,
      name: block.name,
      owner: `${block.file}:${block.name}`,
    });
  }

  return windows;
}

export function normalizeImplementation(source) {
  return stripComments(source)
    .replace(/`(?:\\.|[^`\\])*`/g, "`__template__`")
    .replace(/"(?:\\.|[^"\\])*"/g, '"__string__"')
    .replace(/'(?:\\.|[^'\\])*'/g, "'__string__'")
    .replace(/\/(?:\\.|[^/\\\n])+\/[dgimsuvy]*/g, "/__regex__/")
    .replace(/\b\d+(?:\.\d)?\b/g, "0")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeOptionCollection(source) {
  return stripComments(source).replace(/\s+/g, " ").trim();
}

function tokenizeForCloneDetection(source, startLine) {
  const scrubbed = maskCommentsAndLiterals(source);
  const tokens = [];
  const tokenPattern =
    /__literal__|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|===|!==|=>|==|!=|<=|>=|&&|\|\||[{}()[\].,?:;+\-*\/%<>=!]/g;
  let cursor = 0;
  let line = startLine;

  for (const match of scrubbed.matchAll(tokenPattern)) {
    line += countNewlines(scrubbed.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    tokens.push({
      line,
      value: normalizeToken(match[0]),
    });
  }

  return tokens;
}

function maskCommentsAndLiterals(source) {
  let output = "";
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const previous = source[index - 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += "\n";
      } else {
        output += " ";
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        output += "  ";
        index += 1;
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      output += char === "\n" ? "\n" : " ";
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      output += "  ";
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      output += "  ";
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      output += "__literal__";
      continue;
    }

    output += char;
  }

  return output;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function normalizeToken(token) {
  if (/^\d/.test(token)) return "__number__";
  return token;
}

function tokenCount(source) {
  return source.split(/[^A-Za-z0-9_$]+/).filter(Boolean).length;
}

function countNewlines(source) {
  return (source.match(/\n/g) ?? []).length;
}

function countOptionItems(source) {
  return (source.match(/\b(?:label|value|id|key)\s*:/g) ?? []).length;
}
