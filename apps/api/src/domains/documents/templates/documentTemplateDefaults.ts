import {
  documentTemplateKeys,
  findDocumentTemplateDefinition,
  getDocumentTemplateClauses,
  listDocumentTemplateDefinitions,
  type DocumentBlock,
  type DocumentTemplateDefinition,
} from "@lojaveiculosv2/documents";
import type {
  DocumentKind,
  DocumentTemplate,
} from "../ports/documentRepository.js";

export const documentTemplateKinds = documentTemplateKeys;

export function listDefaultDocumentTemplates(): readonly DocumentTemplate[] {
  return listDocumentTemplateDefinitions().map(toDefaultTemplate);
}

export function defaultTemplate(
  kind: DocumentKind,
  templateKey: string = kind,
): DocumentTemplate | null {
  const definition =
    findDocumentTemplateDefinition(templateKey) ??
    listDocumentTemplateDefinitions().find(
      (template) => template.kind === kind,
    ) ??
    null;
  return definition ? toDefaultTemplate(definition) : null;
}

export function mergeDocumentTemplate(
  kind: DocumentKind,
  override: {
    blocks?: readonly Record<string, unknown>[] | undefined;
    clauses: readonly string[];
    templateKey?: string | undefined;
    title: string;
    updatedAt: Date | null;
  } | null,
  templateKey: string = override?.templateKey ?? kind,
): DocumentTemplate | null {
  const fallback = defaultTemplate(kind, templateKey);
  if (!fallback) return null;
  if (!override) return fallback;
  const blocks = override.blocks?.length
    ? override.blocks
    : clausesToBlocks(override.clauses);
  return {
    ...fallback,
    blocks,
    clauses: override.clauses,
    isCustomized: true,
    source: "store",
    templateKey,
    title: override.title,
    updatedAt: override.updatedAt,
  };
}

export function isTemplateKind(kind: DocumentKind): boolean {
  return Boolean(defaultTemplate(kind));
}

function toDefaultTemplate(
  definition: DocumentTemplateDefinition,
): DocumentTemplate {
  const blocks = definition.defaultBlocks as readonly Record<string, unknown>[];
  const clauses = getDocumentTemplateClauses(definition.defaultBlocks);
  return {
    availableVariables: definition.availableVariables,
    blocks,
    category: definition.category,
    clauses,
    context: definition.context,
    defaultBlocks: blocks,
    defaultClauses: clauses,
    defaultTitle: definition.title,
    description: definition.description,
    isCustomized: false,
    kind: definition.kind as DocumentKind,
    mode: definition.mode,
    source: definition.source,
    templateKey: definition.templateKey,
    title: definition.title,
    updatedAt: null,
  };
}

function clausesToBlocks(clauses: readonly string[]) {
  return clauses.map((body, index): DocumentBlock => ({
    body,
    id: `legacy_clause_${index + 1}`,
    label: `Clausula ${index + 1}`,
    type: "clause",
  }));
}
