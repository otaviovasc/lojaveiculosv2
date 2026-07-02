import {
  FiscalDocumentNotFoundError,
  FiscalRecipientNotFoundError,
  FiscalTemplateNotFoundError,
} from "../../../../domains/fiscal/domain/fiscalErrors.js";
import type {
  CreateFiscalDocumentInput,
  CreateFiscalRecipientInput,
  CreateFiscalTemplateInput,
  FiscalDocument,
  FiscalOverview,
  FiscalRepository,
  FiscalServiceInvoiceTemplate,
  FiscalServiceRecipient,
  UpdateFiscalDocumentStatusInput,
} from "../../../../domains/fiscal/ports/fiscalRepository.js";

export function createMemoryFiscalRepository(): FiscalRepository {
  const documents: FiscalDocument[] = [];
  const recipients: FiscalServiceRecipient[] = [];
  const templates: FiscalServiceInvoiceTemplate[] = [];

  return {
    async createDocument(input) {
      const document = toDocument(input);
      documents.unshift(document);
      return document;
    },
    async createDocumentSnapshot() {},
    async createRecipient(input) {
      const recipient = toRecipient(input);
      recipients.unshift(recipient);
      return recipient;
    },
    async createTemplate(input) {
      const template = toTemplate(input);
      templates.unshift(template);
      return template;
    },
    async getOverview(input) {
      return createOverview(input, scoped(documents, input));
    },
    async getDocument(input) {
      return findScoped(documents, input.documentId, input);
    },
    async getRecipient(input) {
      return findScoped(recipients, input.id, input);
    },
    async getTemplate(input) {
      return findScoped(templates, input.id, input);
    },
    async listRecipients(input) {
      return scoped(recipients, input).filter((item) => item.isActive);
    },
    async listTemplates(input) {
      return scoped(templates, input).filter(
        (item) =>
          item.isActive &&
          (input.recipientId === undefined ||
            item.recipientId === input.recipientId),
      );
    },
    async updateDocumentStatus(input) {
      const document = findScoped(documents, input.documentId, input);
      if (!document) throw new FiscalDocumentNotFoundError(input.documentId);

      document.accessKey = input.accessKey ?? document.accessKey;
      document.metadata = { ...document.metadata, ...(input.metadata ?? {}) };
      document.providerDocumentId =
        input.providerDocumentId ?? document.providerDocumentId;
      document.status = input.status;
      document.issuedAt = isIssuedStatus(input.status)
        ? new Date()
        : document.issuedAt;
      return document;
    },
    async updateRecipient(input) {
      const recipient = findScoped(recipients, input.id, input);
      if (!recipient) throw new FiscalRecipientNotFoundError(input.id);
      Object.assign(recipient, omitIdentity(input), { updatedAt: new Date() });
      return recipient;
    },
    async updateTemplate(input) {
      const template = findScoped(templates, input.id, input);
      if (!template) throw new FiscalTemplateNotFoundError(input.id);
      Object.assign(template, omitIdentity(input), { updatedAt: new Date() });
      return template;
    },
  };
}

function toDocument(input: CreateFiscalDocumentInput): FiscalDocument {
  const now = new Date();
  return {
    accessKey: input.accessKey ?? null,
    createdAt: now,
    documentKind: input.documentKind ?? "nfe",
    documentType: input.documentType,
    id: crypto.randomUUID(),
    issuedAt: isIssuedStatus(input.status) ? now : null,
    metadata: input.metadata ?? {},
    provider: "spedy",
    providerDocumentId: input.providerDocumentId ?? null,
    recipientId: input.recipientId ?? null,
    status: input.status,
    storeId: input.storeId,
    templateId: input.templateId ?? null,
    templateVersion: input.templateVersion ?? null,
    tenantId: input.tenantId,
  };
}

function toRecipient(
  input: CreateFiscalRecipientInput,
): FiscalServiceRecipient {
  const now = new Date();
  return {
    address: input.address ?? {},
    createdAt: now,
    defaultServiceTemplateId: input.defaultServiceTemplateId ?? null,
    documentNumber: input.documentNumber,
    documentType: input.documentType,
    email: input.email ?? null,
    id: crypto.randomUUID(),
    isActive: input.isActive ?? true,
    legalName: input.legalName,
    municipalRegistration: input.municipalRegistration ?? null,
    notes: input.notes ?? null,
    phone: input.phone ?? null,
    stateRegistration: input.stateRegistration ?? null,
    storeId: input.storeId,
    tenantId: input.tenantId,
    tradeName: input.tradeName ?? null,
    updatedAt: now,
  };
}

function toTemplate(
  input: CreateFiscalTemplateInput,
): FiscalServiceInvoiceTemplate {
  const now = new Date();
  return {
    cityServiceCode: input.cityServiceCode ?? null,
    createdAt: now,
    defaultMunicipalityOfIncidence:
      input.defaultMunicipalityOfIncidence ?? null,
    defaultServiceLocation: input.defaultServiceLocation ?? null,
    defaultTaxationType: input.defaultTaxationType ?? null,
    descriptionTemplate: input.descriptionTemplate,
    id: crypto.randomUUID(),
    includeApproximateTaxes: input.includeApproximateTaxes ?? false,
    isActive: input.isActive ?? true,
    isDefaultForRecipient: input.isDefaultForRecipient ?? false,
    name: input.name,
    recipientId: input.recipientId ?? null,
    requirements: input.requirements ?? {},
    retentionConfig: input.retentionConfig ?? {},
    serviceMunicipalCode: input.serviceMunicipalCode ?? null,
    serviceNationalCode: input.serviceNationalCode,
    storeId: input.storeId,
    taxConfig: input.taxConfig ?? {},
    tenantId: input.tenantId,
    updatedAt: now,
    useCase: input.useCase,
    version: input.version ?? 1,
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

function isIssuedStatus(status: FiscalDocument["status"]) {
  return status === "authorized" || status === "issued";
}

function scoped<T extends { storeId: string; tenantId: string }>(
  items: T[],
  input: { storeId: string; tenantId: string },
) {
  return items.filter(
    (item) =>
      item.storeId === input.storeId && item.tenantId === input.tenantId,
  );
}

function findScoped<
  T extends { id: string; storeId: string; tenantId: string },
>(items: T[], id: string, input: { storeId: string; tenantId: string }) {
  return scoped(items, input).find((item) => item.id === id) ?? null;
}

function omitIdentity<
  T extends { id: string; storeId: string; tenantId: string },
>(input: T) {
  const { id: _id, storeId: _storeId, tenantId: _tenantId, ...rest } = input;
  return rest;
}
