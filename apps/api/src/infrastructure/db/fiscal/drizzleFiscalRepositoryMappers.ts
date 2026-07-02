import type {
  fiscalDocuments,
  fiscalEvents,
  fiscalServiceInvoiceTemplates,
  fiscalServiceRecipients,
} from "@lojaveiculosv2/db";
import type {
  FiscalDocument,
  FiscalOverview,
  FiscalServiceInvoiceTemplate,
  FiscalServiceRecipient,
} from "../../../domains/fiscal/ports/fiscalRepository.js";

export function toDocument(
  row: typeof fiscalDocuments.$inferSelect,
): FiscalDocument {
  return {
    accessKey: row.accessKey,
    createdAt: row.createdAt,
    documentKind: row.documentKind,
    documentType: row.documentType,
    id: row.id,
    issuedAt: row.issuedAt,
    metadata: toRecord(row.metadata),
    provider: "spedy",
    providerDocumentId: row.providerDocumentId,
    recipientId: row.recipientId,
    status: row.status,
    storeId: row.storeId,
    templateId: row.templateId,
    templateVersion: row.templateVersion,
    tenantId: row.tenantId,
  };
}

export function toRecipient(
  row: typeof fiscalServiceRecipients.$inferSelect,
): FiscalServiceRecipient {
  return {
    address: toRecord(row.address),
    createdAt: row.createdAt,
    defaultServiceTemplateId: row.defaultServiceTemplateId,
    documentNumber: row.documentNumber,
    documentType: row.documentType,
    email: row.email,
    id: row.id,
    isActive: row.isActive,
    legalName: row.legalName,
    municipalRegistration: row.municipalRegistration,
    notes: row.notes,
    phone: row.phone,
    stateRegistration: row.stateRegistration,
    storeId: row.storeId,
    tenantId: row.tenantId,
    tradeName: row.tradeName,
    updatedAt: row.updatedAt,
  };
}

export function toTemplate(
  row: typeof fiscalServiceInvoiceTemplates.$inferSelect,
): FiscalServiceInvoiceTemplate {
  return {
    cityServiceCode: row.cityServiceCode,
    createdAt: row.createdAt,
    defaultMunicipalityOfIncidence: row.defaultMunicipalityOfIncidence,
    defaultServiceLocation: row.defaultServiceLocation,
    defaultTaxationType: row.defaultTaxationType,
    descriptionTemplate: row.descriptionTemplate,
    id: row.id,
    includeApproximateTaxes: row.includeApproximateTaxes,
    isActive: row.isActive,
    isDefaultForRecipient: row.isDefaultForRecipient,
    name: row.name,
    recipientId: row.recipientId,
    requirements: toRecord(row.requirements),
    retentionConfig: toRecord(row.retentionConfig),
    serviceMunicipalCode: row.serviceMunicipalCode,
    serviceNationalCode: row.serviceNationalCode,
    storeId: row.storeId,
    taxConfig: toRecord(row.taxConfig),
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
    useCase: row.useCase,
    version: row.version,
  };
}

export function toOverview(
  input: { storeId: string; tenantId: string },
  documents: FiscalDocument[],
  events: (typeof fiscalEvents.$inferSelect)[],
): FiscalOverview {
  return {
    documents,
    events: events.map((event) => ({
      createdAt: event.createdAt,
      eventType: event.eventType,
      fiscalDocumentId: event.fiscalDocumentId,
      id: event.id,
      metadata: toRecord(event.metadata),
      occurredAt: event.occurredAt,
    })),
    provider: {
      configured: false,
      missingConfiguration: ["SPEDY_HTTP_GATEWAY"],
      provider: "spedy",
      webhookConfigured: false,
    },
    storeId: input.storeId,
    summary: {
      cancelled: documents.filter((document) => document.status === "cancelled")
        .length,
      failed: documents.filter((document) =>
        ["error", "failed", "rejected"].includes(document.status),
      ).length,
      issued: documents.filter((document) => isIssuedStatus(document.status))
        .length,
      pending: documents.filter((document) =>
        ["draft", "processing", "queued"].includes(document.status),
      ).length,
    },
    tenantId: input.tenantId,
  };
}

export function isIssuedStatus(status: FiscalDocument["status"]) {
  return status === "authorized" || status === "issued";
}

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
