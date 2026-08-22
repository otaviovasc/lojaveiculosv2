import type {
  FiscalDocument,
  FiscalOverview,
} from "../../../domains/fiscal/ports/fiscalRepository.js";

export function toFiscalDocumentDto(document: FiscalDocument) {
  return {
    accessKey: document.accessKey,
    createdAt: document.createdAt,
    documentKind: document.documentKind,
    documentType: document.documentType,
    hasProviderReference: Boolean(document.providerDocumentId),
    id: document.id,
    issuedAt: document.issuedAt,
    metadata: document.metadata,
    provider: document.provider,
    recipientId: document.recipientId,
    status: document.status,
    templateId: document.templateId,
    templateVersion: document.templateVersion,
  };
}

export function toFiscalOverviewDto(overview: FiscalOverview) {
  return {
    capabilities: overview.capabilities,
    documents: overview.documents.map(toFiscalDocumentDto),
    provider: overview.provider,
    summary: overview.summary,
  };
}
