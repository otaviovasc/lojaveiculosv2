import {
  parseTypeScriptSource,
  propertyNameText,
  sourceLine,
  staticString,
  ts,
  walkTypeScript,
} from "./typescript-source.mjs";
import {
  collectInputMaskReferences,
  collectInputSignals,
} from "./input-mask-source.mjs";
import { inputHasMask } from "./input-mask-flow.mjs";

export const inputMaskMessages = {
  document: {
    label: "Brazilian document input without a mask",
    suggestion:
      "Apply formatBrazilianDocument, formatBrazilianCpf, or formatBrazilianCnpj from the shared mask utilities in the input value/change path.",
  },
  phone: {
    label: "phone input without a mask",
    suggestion:
      "Apply formatBrazilianPhone from the shared mask utilities in the input value/change path.",
  },
  "phone-e164": {
    label: "Brazilian E.164 WhatsApp input without a mask",
    suggestion:
      "Apply formatBrazilianWhatsappPhone from the shared mask utilities so the 55 country code is preserved.",
  },
  "pix-key": {
    label: "dynamic PIX key input without a category-aware mask",
    suggestion:
      "Apply formatBrazilianPixKey from the shared mask utilities so CPF, CNPJ, and phone PIX keys follow the selected key category.",
  },
  "zip-code": {
    label: "Brazilian ZIP code input without a mask",
    suggestion:
      "Apply formatBrazilianZipCode from the shared mask utilities in the input value/change path.",
  },
};

const ignoredInputTypes = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "radio",
  "range",
  "reset",
  "search",
  "submit",
]);

export function findInputMaskViolations(file, source) {
  const sourceFile = parseTypeScriptSource(file, source);
  const references = collectInputMaskReferences(sourceFile);
  const violations = [];

  walkTypeScript(sourceFile, (node) => {
    if (!isInputElement(node, sourceFile) || isIgnoredInput(node)) return;
    const kind = inferMaskKind(node, sourceFile);
    if (!kind || inputHasMask(node, kind, references)) return;
    violations.push({
      kind,
      line: sourceLine(sourceFile, node),
      tagName: node.tagName.getText(sourceFile),
    });
  });

  return violations;
}

function isInputElement(node, sourceFile) {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }
  const tag = node.tagName.getText(sourceFile).split(".").at(-1);
  if (
    /(?:Tabs?|Select|Picker|Toggle|Checkbox|Radio|Textarea)(?:Input)?$/.test(
      tag ?? "",
    )
  ) {
    return false;
  }
  return (
    tag === "input" ||
    tag?.endsWith("Input") === true ||
    tag?.endsWith("TextField") === true
  );
}

function isIgnoredInput(node) {
  const type = staticAttribute(node, "type")?.toLowerCase();
  return ignoredInputTypes.has(type);
}

function inferMaskKind(node, sourceFile) {
  const signals = collectInputSignals(node, sourceFile);
  const normalizedSignals = signals.map(normalize);
  const normalized = normalizedSignals.join(" ");
  if (/\b(?:search|query|filter|busca|buscar|pesquisa)\b/.test(normalized)) {
    return null;
  }
  if (
    normalizedSignals.some(
      (signal) =>
        /^(?:default value|field|id|name|on change|on input|on value change|value):.*\bpix key\b/.test(
          signal,
        ) || /^label:.*\bchave pix\b/.test(signal),
    )
  ) {
    return "pix-key";
  }
  if (
    /\bsocial links[.]whatsapp\b/.test(normalized) ||
    /\b(?:draft|settings|storefront|website|config|store)[.\s]+profile[.\s]+whatsapp phone\b/.test(
      normalized,
    ) ||
    (/(?:\be\s*164\b|\bcountry\s+(?:code|coded)\b|\binternational\b)/.test(
      normalized,
    ) &&
      /\b(?:phone|telefone|celular|whatsapp|mobile|fone)\b/.test(normalized)) ||
    normalizedSignals.some((signal) =>
      /^placeholder:[+]?55(?:\s|\(|\d)/.test(signal),
    )
  ) {
    return "phone-e164";
  }
  if (
    /\b(?:cpf|cnpj|tax id)\b/.test(normalized) ||
    /\bdocument(?:o)? number\b/.test(normalized) ||
    /\bbuyer[.\s]+document\b/.test(normalized) ||
    /\d{3}[.]\d{3}[.]\d{3}-\d{2}|\d{2}[.]\d{3}[.]\d{3}[/]\d{4}-\d{2}/.test(
      normalized,
    )
  ) {
    return "document";
  }
  if (
    /\b(?:phone|telefone|celular|whatsapp|mobile|fone)\b/.test(normalized) &&
    !/\b(?:url|link|href|message|template|token|status|channel)\b/.test(
      normalized,
    )
  ) {
    return "phone";
  }
  if (
    /\bcep\b|\b(?:zip|postal) code\b|\baddress zip\b/.test(normalized) ||
    /\d{5}-\d{3}/.test(normalized)
  ) {
    return "zip-code";
  }
  return null;
}

function staticAttribute(node, target) {
  for (const attribute of node.attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue;
    if (propertyNameText(attribute.name) === target) {
      return staticString(attribute.initializer);
    }
  }
  return null;
}

function normalize(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
