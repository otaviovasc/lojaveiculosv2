import type { FiscalServicePorts } from "./services/FiscalService/serviceSupport.js";
import type {
  CreateFiscalDocumentInput,
  CreateFiscalRecipientInput,
  CreateFiscalTemplateInput,
  FiscalDocument,
  FiscalRepository,
  FiscalServiceInvoiceTemplate,
  FiscalServiceRecipient,
} from "./ports/fiscalRepository.js";
import { FiscalDocumentNotFoundError } from "./domain/fiscalErrors.js";

export function createFiscalTestPorts(): FiscalServicePorts {
  return {
    fiscalProviderGateway: {
      async cancelDocument(input) {
        return {
          accessKey: null,
          providerDocumentId: input.providerDocumentId,
          status: "cancelled",
        };
      },
      async getProviderStatus() {
        return {
          configured: true,
          missingConfiguration: [],
          provider: "spedy",
          webhookConfigured: true,
        };
      },
      async issueDocument(input) {
        return {
          accessKey: `access_${input.storeId}`,
          providerDocumentId: `provider_${crypto.randomUUID()}`,
          status: "issued",
        };
      },
      async syncDocumentStatus(input) {
        return {
          accessKey: null,
          providerDocumentId: input.providerDocumentId,
          status: "issued",
        };
      },
    },
    fiscalRepository: createFiscalTestRepository(),
  };
}

function createFiscalTestRepository(): FiscalRepository {
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
    async findDocumentById(input) {
      return (
        documents.find(
          (item) =>
            item.id === input.documentId &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async getOverview() {
      throw new Error("Test repository overview is not implemented.");
    },
    async getDocument(input) {
      return (
        documents.find(
          (item) =>
            item.id === input.documentId &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async getRecipient(input) {
      return recipients.find((item) => item.id === input.id) ?? null;
    },
    async getTemplate(input) {
      return templates.find((item) => item.id === input.id) ?? null;
    },
    async listRecipients() {
      return recipients.filter((item) => item.isActive);
    },
    async listTemplates() {
      return templates.filter((item) => item.isActive);
    },
    async updateDocumentStatus(input) {
      const document = documents.find((item) => item.id === input.documentId);
      if (!document) throw new FiscalDocumentNotFoundError(input.documentId);
      Object.assign(document, {
        accessKey: input.accessKey ?? document.accessKey,
        metadata: { ...document.metadata, ...(input.metadata ?? {}) },
        providerDocumentId:
          input.providerDocumentId ?? document.providerDocumentId,
        status: input.status,
      });
      return document;
    },
    async updateRecipient(input) {
      const recipient = recipients.find((item) => item.id === input.id);
      if (!recipient) throw new Error("Recipient not found.");
      Object.assign(recipient, input);
      return recipient;
    },
    async updateTemplate(input) {
      const template = templates.find((item) => item.id === input.id);
      if (!template) throw new Error("Template not found.");
      Object.assign(template, input);
      return template;
    },
  };
}

function toDocument(input: CreateFiscalDocumentInput): FiscalDocument {
  return {
    accessKey: input.accessKey ?? null,
    createdAt: new Date(),
    documentKind: input.documentKind ?? "nfe",
    documentType: input.documentType,
    id: crypto.randomUUID(),
    issuedAt: null,
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
    defaultMunicipalityOfIncidence: null,
    defaultServiceLocation: null,
    defaultTaxationType: null,
    descriptionTemplate: input.descriptionTemplate,
    id: crypto.randomUUID(),
    includeApproximateTaxes: false,
    isActive: input.isActive ?? true,
    isDefaultForRecipient: false,
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

export function unexpectedCall(name: string): never {
  return (async () => {
    throw new Error(`Unexpected ${name} call.`);
  }) as never;
}
