import type {
  CreateLinkedDocumentInput,
  DocumentRepository,
  LinkedDocument,
  ListLinkedDocumentsInput,
} from "./ports/documentRepository.js";

export type TestDocumentRepository = DocumentRepository & {
  documents: LinkedDocument[];
};

export function createTestDocumentRepository(): TestDocumentRepository {
  const documents: LinkedDocument[] = [];

  return {
    documents,
    async create(input: CreateLinkedDocumentInput) {
      const now = new Date();
      const document: LinkedDocument = {
        ...input,
        createdAt: now,
        id: `document_${documents.length + 1}`,
        metadata: input.metadata ?? {},
        updatedAt: now,
        uploadedAt: now,
      };
      documents.push(document);
      return document;
    },
    async listByTarget(input: ListLinkedDocumentsInput) {
      return documents.filter(
        (document) =>
          document.storeId === input.storeId &&
          document.targetId === input.targetId &&
          document.targetType === input.targetType &&
          document.tenantId === input.tenantId,
      );
    },
  };
}
