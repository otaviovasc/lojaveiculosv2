import { blockText } from "./blockBuilders.js";
import { editableDocumentTemplates } from "./editableTemplates.js";
import { lockedDocumentTemplates } from "./lockedTemplates.js";
import type {
  DocumentBlock,
  DocumentTemplateDefinition,
  DocumentTemplateKey,
} from "./types.js";
import { documentTemplateKeys } from "./types.js";

export const documentTemplateCatalog = [
  ...editableDocumentTemplates,
  ...lockedDocumentTemplates,
] as const satisfies readonly DocumentTemplateDefinition[];

export function listDocumentTemplateDefinitions() {
  return documentTemplateCatalog;
}

export function findDocumentTemplateDefinition(
  templateKey: string,
): DocumentTemplateDefinition | null {
  return (
    documentTemplateCatalog.find(
      (template) => template.templateKey === templateKey,
    ) ?? null
  );
}

export function isDocumentTemplateKey(
  value: string,
): value is DocumentTemplateKey {
  return (documentTemplateKeys as readonly string[]).includes(value);
}

export function getDocumentTemplateClauses(
  blocks: readonly DocumentBlock[],
): readonly string[] {
  return blocks
    .map(blockText)
    .filter((value): value is string => Boolean(value?.trim()));
}

export function getDefaultDocumentTemplate(
  templateKey: string,
): DocumentTemplateDefinition | null {
  return findDocumentTemplateDefinition(templateKey);
}
