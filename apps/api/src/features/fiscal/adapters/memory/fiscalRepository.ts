import type {
  CreateFiscalDocumentInput,
  FiscalDocument,
  FiscalOverview,
  FiscalRepository,
  UpdateFiscalDocumentStatusInput,
} from "../../../../domains/fiscal/ports/fiscalRepository.js";

export function createMemoryFiscalRepository(): FiscalRepository {
  const documents: FiscalDocument[] = [];

  return {
    async createDocument(input) {
      const document = toDocument(input);
      documents.unshift(document);
      return document;
    },
    async findDocumentById(input) {
      return (
        documents.find(
          (document) =>
            document.id === input.documentId &&
            document.storeId === input.storeId &&
            document.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async getOverview(input) {
      const scopedDocuments = documents.filter(
        (document) =>
          document.storeId === input.storeId &&
          document.tenantId === input.tenantId,
      );

      return createOverview(input, scopedDocuments);
    },
    async updateDocumentStatus(input) {
      const document = documents.find(
        (item) =>
          item.id === input.documentId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!document) throw new FiscalDocumentNotFoundError(input.documentId);

      document.accessKey = input.accessKey ?? document.accessKey;
      document.metadata = { ...document.metadata, ...(input.metadata ?? {}) };
      document.providerDocumentId =
        input.providerDocumentId ?? document.providerDocumentId;
      document.status = input.status;
      document.issuedAt =
        input.status === "issued" ? new Date() : document.issuedAt;
      return document;
    },
  };
}

export class FiscalDocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Fiscal document not found: ${documentId}`);
    this.name = "FiscalDocumentNotFoundError";
  }
}

function toDocument(input: CreateFiscalDocumentInput): FiscalDocument {
  const now = new Date();
  return {
    accessKey: input.accessKey ?? null,
    createdAt: now,
    documentType: input.documentType,
    id: crypto.randomUUID(),
    issuedAt: input.status === "issued" ? now : null,
    metadata: input.metadata ?? {},
    provider: "spedy",
    providerDocumentId: input.providerDocumentId ?? null,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
}

function createOverview(
  input: { storeId: string; tenantId: string },
  documents: FiscalDocument[],
): FiscalOverview {
  return {
    documents,
    events: [],
    provider: {
      configured: false,
      missingConfiguration: ["SPEDY_API_URL", "SPEDY_API_TOKEN"],
      provider: "spedy",
      webhookConfigured: false,
    },
    storeId: input.storeId,
    summary: {
      cancelled: documents.filter((document) => document.status === "cancelled")
        .length,
      failed: documents.filter((document) => document.status === "failed")
        .length,
      issued: documents.filter((document) => document.status === "issued")
        .length,
      pending: documents.filter((document) => document.status === "draft")
        .length,
    },
    tenantId: input.tenantId,
  };
}
