import {
  expressionPath,
  propertyNameText,
  staticString,
  ts,
  unwrapExpression,
  walkTypeScript,
} from "./typescript-source.mjs";

const maskNames = new Map([
  ["formatBrazilianDocument", "document"],
  ["formatBrazilianCpf", "document"],
  ["formatBrazilianCnpj", "document"],
  ["formatBrazilianPhone", "phone"],
  ["formatBrazilianWhatsappPhone", "phone-e164"],
  ["formatBrazilianZipCode", "zip-code"],
  ["formatBrazilianPixKey", "pix-key"],
]);

const semanticAttributes = new Set([
  "aria-label",
  "ariaLabel",
  "autoComplete",
  "defaultValue",
  "field",
  "id",
  "inputMode",
  "label",
  "mask",
  "name",
  "onBlur",
  "onChange",
  "onInput",
  "onValueChange",
  "placeholder",
  "type",
  "value",
]);

export function collectInputMaskReferences(sourceFile) {
  const aliases = new Map();
  const helpers = new Set();
  const namespaces = new Set();
  const nodes = new Map();
  walkTypeScript(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      collectTrustedImport(node, sourceFile, aliases, helpers, namespaces);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.initializer) nodes.set(node.name.text, node.initializer);
    } else if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      nodes.set(node.name.text, node);
    }
  });
  return { aliases, helpers, namespaces, nodes };
}

export function collectInputSignals(node, sourceFile) {
  const signals = collectElementSignals(node, sourceFile);
  const ancestor = immediateFieldAncestor(node, sourceFile);
  if (!ancestor) return signals;
  signals.push(...collectElementSignals(ancestor.openingElement, sourceFile));
  if (ancestor.openingElement.tagName.getText(sourceFile) === "label") {
    walkTypeScript(ancestor, (child) => {
      if (ts.isJsxText(child) && child.text.trim()) {
        signals.push(`label:${child.text.trim()}`);
      }
    });
  }
  return signals;
}

function collectElementSignals(node, sourceFile) {
  const signals = [];
  for (const attribute of node.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      signals.push(attribute.expression.getText(sourceFile));
      continue;
    }
    const name = propertyNameText(attribute.name);
    if (!semanticAttributes.has(name)) continue;
    const expression = inputMaskAttributeExpression(attribute);
    if (expression) {
      signals.push(`${name}:${expressionSignal(name, expression, sourceFile)}`);
    } else {
      const text = staticString(attribute.initializer);
      if (text) signals.push(`${name}:${text}`);
    }
  }
  return signals;
}

function immediateFieldAncestor(node, sourceFile) {
  let ancestor = node.parent;
  if (ts.isJsxElement(ancestor) && ancestor.openingElement === node) {
    ancestor = ancestor.parent;
  }
  if (!ts.isJsxElement(ancestor)) return null;
  const tag = ancestor.openingElement.tagName
    .getText(sourceFile)
    .split(".")
    .at(-1);
  return tag === "label" || tag?.endsWith("Field") === true ? ancestor : null;
}

function expressionSignal(name, expression, sourceFile) {
  if (name !== "label" && name !== "aria-label" && name !== "ariaLabel") {
    return expression.getText(sourceFile);
  }
  const strings = [];
  walkTypeScript(expression, (node) => {
    if (ts.isStringLiteralLike(node)) strings.push(node.text);
    if (ts.isJsxText(node) && node.text.trim()) strings.push(node.text.trim());
  });
  return strings.length ? strings.join(" ") : expression.getText(sourceFile);
}

export function maskKindForReference(node, references) {
  const path = expressionPath(node);
  const directName = path?.split(".").at(-1);
  const namespace = path?.split(".")[0];
  return (
    references.aliases.get(path) ??
    (references.namespaces.has(namespace) ? maskNames.get(directName) : null)
  );
}

export function isInputMaskHelperReference(node, references) {
  const path = expressionPath(node);
  const directName = path?.split(".").at(-1);
  const namespace = path?.split(".")[0];
  return (
    references.helpers.has(path) ||
    (references.namespaces.has(namespace) && directName === "applyInputMask")
  );
}

export function resolveInputMaskReference(node, references, seen = new Set()) {
  const current = unwrapExpression(node);
  if (!ts.isIdentifier(current) || !references.nodes.has(current.text)) {
    return current;
  }
  if (seen.has(current.text)) return current;
  seen.add(current.text);
  return resolveInputMaskReference(
    references.nodes.get(current.text),
    references,
    seen,
  );
}

function collectTrustedImport(node, sourceFile, aliases, helpers, namespaces) {
  const specifier = staticString(node.moduleSpecifier);
  if (!isTrustedMaskModule(specifier, sourceFile.fileName)) return;
  const bindings = node.importClause?.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) {
    namespaces.add(bindings.name.text);
    return;
  }
  if (!bindings || !ts.isNamedImports(bindings)) return;
  for (const element of bindings.elements) {
    const imported = element.propertyName?.text ?? element.name.text;
    if (imported === "applyInputMask") {
      helpers.add(element.name.text);
      continue;
    }
    const kind = maskNames.get(imported);
    if (kind) aliases.set(element.name.text, kind);
  }
}

function isTrustedMaskModule(specifier, file) {
  if (specifier === "@lojaveiculosv2/shared" || specifier === "@/lib/masks") {
    return true;
  }
  if (!specifier?.startsWith(".")) return false;
  const normalizedFile = file.replaceAll("\\", "/");
  const marker = "apps/web/src/";
  const markerIndex = normalizedFile.indexOf(marker);
  if (markerIndex === -1) return false;
  const sourceRoot = normalizedFile.slice(0, markerIndex + marker.length - 1);
  const baseParts = normalizedFile
    .slice(0, normalizedFile.lastIndexOf("/"))
    .split("/");
  for (const part of specifier.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  const resolved = baseParts.join("/").replace(/\.(?:[cm]?[jt]sx?)$/, "");
  return resolved === `${sourceRoot}/lib/masks`;
}

export function inputMaskAttributeExpression(attribute) {
  if (!attribute.initializer) return null;
  if (ts.isJsxExpression(attribute.initializer)) {
    return attribute.initializer.expression ?? null;
  }
  return null;
}
