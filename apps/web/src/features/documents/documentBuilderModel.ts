import {
  interpolateSampleVariables,
  sampleValue,
} from "@lojaveiculosv2/documents";
import type {
  DocumentKind,
  DocumentTemplate,
  DocumentTemplateBlock,
  DocumentTemplateSuggestion,
} from "./types";

export type DocumentBuilderDraft = {
  blocks: DocumentTemplateBlock[];
  title: string;
};

export type DocumentBuilderSaveState =
  "dirty" | "error" | "idle" | "saved" | "saving";

export function createDocumentBuilderDraft(
  template: DocumentTemplate | null,
): DocumentBuilderDraft {
  if (!template) return { blocks: [], title: "" };
  return {
    blocks: cloneBlocks(template.blocks),
    title: template.title,
  };
}

export function createDefaultDocumentBuilderDraft(
  template: DocumentTemplate,
): DocumentBuilderDraft {
  return {
    blocks: cloneBlocks(template.defaultBlocks),
    title: template.defaultTitle,
  };
}

export function documentBuilderClauses(
  blocks: readonly DocumentTemplateBlock[],
) {
  const clauses = blocks.flatMap((block) => {
    if (block.type === "clause" || block.type === "paragraph") {
      return block.body.trim() ? [block.body.trim()] : [];
    }
    return [];
  });
  return clauses.length ? clauses : ["Documento em branco."];
}

export function createClauseBlock(body = ""): DocumentTemplateBlock {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `clause_${Date.now()}`;
  return {
    body,
    id,
    label: "Nova clausula",
    type: "clause",
  };
}

export function updateBlockBody(
  block: DocumentTemplateBlock,
  body: string,
): DocumentTemplateBlock {
  if (block.type !== "clause" && block.type !== "paragraph") return block;
  return { ...block, body };
}

export function isDocumentBuilderDirty(
  template: DocumentTemplate | null,
  draft: DocumentBuilderDraft,
) {
  if (!template) return false;
  return (
    template.title !== draft.title ||
    JSON.stringify(template.blocks) !== JSON.stringify(draft.blocks)
  );
}

export function applyDocumentBuilderSuggestion(
  suggestion: DocumentTemplateSuggestion,
): DocumentBuilderDraft {
  return {
    blocks: suggestion.appliedBlocks.length
      ? cloneBlocks(suggestion.appliedBlocks)
      : clausesToBlocks(suggestion.appliedClauses),
    title: suggestion.appliedTitle,
  };
}

export function templateKindLabel(kind: DocumentKind) {
  const labels: Partial<Record<DocumentKind, string>> = {
    delivery_term: "Entrega",
    finance_receipt: "Financeiro",
    inspection: "Checklist",
    internal: "Interno",
    invoice: "Fiscal",
    other: "Outro",
    power_of_attorney: "Procuração",
    reservation_receipt: "Reserva",
    sale_contract: "Contrato",
    sale_receipt: "Recibo",
    test_drive: "Test drive",
  };
  return labels[kind] ?? kind;
}

export function blockTitle(block: DocumentTemplateBlock, index: number) {
  if (block.type === "heading") return block.text || `Titulo ${index + 1}`;
  if (block.type === "field_grid") return block.title;
  if (block.type === "signature") return block.title ?? "Assinaturas";
  if (block.type === "table") return block.title;
  return block.label ?? `Bloco ${index + 1}`;
}

export function sampleVariable(token: string) {
  return sampleValue(token);
}

export function renderSampleText(value: string) {
  return interpolateSampleVariables(value);
}

function cloneBlocks(
  blocks: readonly DocumentTemplateBlock[],
): DocumentTemplateBlock[] {
  return blocks.map((block) => structuredClone(block));
}

function clausesToBlocks(clauses: readonly string[]): DocumentTemplateBlock[] {
  return clauses.map((body, index) => ({
    body,
    id: `suggested_clause_${index + 1}`,
    label: `Clausula ${index + 1}`,
    type: "clause",
  }));
}
