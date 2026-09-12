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
    metadata: sanitizeFiscalMetadata(document.metadata),
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
    events: overview.events.map((event) => ({
      eventType: event.eventType,
      fiscalDocumentId: event.fiscalDocumentId,
      occurredAt: event.occurredAt,
    })),
    provider: overview.provider,
    summary: overview.summary,
  };
}

const privateMetadataKeys = new Set([
  "invoiceid",
  "privatekey",
  "providerdocumentid",
  "providerid",
  "secret",
  "sourceproviderdocumentid",
]);

function sanitizeFiscalMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeFiscalMetadata);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isPrivateMetadataKey(key))
      .map(([key, nested]) => [key, sanitizeFiscalMetadata(nested)]),
  );
}

function normalizeMetadataKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPrivateMetadataKey(key: string) {
  const normalized = normalizeMetadataKey(key);
  return (
    privateMetadataKeys.has(normalized) ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("password") ||
    normalized.endsWith("token")
  );
}
