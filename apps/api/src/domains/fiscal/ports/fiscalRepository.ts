import type {
  CreateFiscalRecipientInput,
  CreateFiscalTemplateInput,
  FiscalServiceInvoiceTemplate,
  FiscalServiceRecipient,
  UpdateFiscalRecipientInput,
  UpdateFiscalTemplateInput,
} from "./fiscalCatalogRepository.js";

export type {
  CreateFiscalRecipientInput,
  CreateFiscalTemplateInput,
  FiscalServiceInvoiceTemplate,
  FiscalServiceRecipient,
  FiscalServiceTemplateUseCase,
  UpdateFiscalRecipientInput,
  UpdateFiscalTemplateInput,
} from "./fiscalCatalogRepository.js";

export type FiscalDocumentKind = "nfe" | "nfse";

export type FiscalDocumentStatus =
  | "authorized"
  | "cancelled"
  | "draft"
  | "error"
  | "failed"
  | "issued"
  | "processing"
  | "queued"
  | "rejected";

export type FiscalDocument = {
  accessKey: string | null;
  createdAt: Date;
  documentKind: FiscalDocumentKind;
  documentType: string;
  id: string;
  issuedAt: Date | null;
  metadata: Record<string, unknown>;
  provider: "spedy";
  providerDocumentId: string | null;
  recipientId: string | null;
  status: FiscalDocumentStatus;
  storeId: string;
  templateId: string | null;
  templateVersion: number | null;
  tenantId: string;
};

export type FiscalEvent = {
  createdAt: Date;
  eventType: string;
  fiscalDocumentId: string;
  id: string;
  metadata: Record<string, unknown>;
  occurredAt: Date;
};

export type FiscalOverview = {
  capabilities: {
    canDownloadOfficialArtifacts: boolean;
  };
  documents: readonly FiscalDocument[];
  events: readonly FiscalEvent[];
  provider: {
    configured: boolean;
    missingConfiguration: readonly string[];
    provider: "spedy";
    webhookConfigured: boolean;
  };
  storeId: string;
  summary: {
    cancelled: number;
    failed: number;
    issued: number;
    pending: number;
  };
  tenantId: string;
};

export type CreateFiscalDocumentInput = {
  accessKey?: string | null;
  documentKind?: FiscalDocumentKind;
  documentType: string;
  metadata?: Record<string, unknown>;
  providerDocumentId?: string | null;
  recipientId?: string | null;
  status: FiscalDocumentStatus;
  storeId: string;
  templateId?: string | null;
  templateVersion?: number | null;
  tenantId: string;
};

export type UpdateFiscalDocumentStatusInput = {
  accessKey?: string | null;
  documentId: string;
  metadata?: Record<string, unknown>;
  providerDocumentId?: string | null;
  status: FiscalDocumentStatus;
  storeId: string;
  tenantId: string;
};

export type UpsertProviderFiscalDocumentInput = {
  accessKey?: string | null;
  documentKind: FiscalDocumentKind;
  documentType: string;
  metadata?: Record<string, unknown>;
  providerDocumentId: string;
  status: FiscalDocumentStatus;
  storeId: string;
  tenantId: string;
};

export type CreateFiscalSnapshotInput = {
  actorId?: string | null;
  fiscalDocumentId: string;
  providerPayload?: Record<string, unknown>;
  providerResponse?: Record<string, unknown>;
  renderedDescription?: string | null;
  snapshotType: string;
  storeId: string;
  tenantId: string;
};

export type FiscalScopeInput = { storeId: string; tenantId: string };
export type ScopedDocumentInput = FiscalScopeInput & { documentId: string };
export type ScopedIdInput = FiscalScopeInput & { id: string };
export type ListFiscalTemplatesInput = FiscalScopeInput & {
  recipientId?: string | null | undefined;
};

export type FiscalRepository = {
  createDocument: (input: CreateFiscalDocumentInput) => Promise<FiscalDocument>;
  createDocumentSnapshot: (input: CreateFiscalSnapshotInput) => Promise<void>;
  createRecipient: (
    input: CreateFiscalRecipientInput,
  ) => Promise<FiscalServiceRecipient>;
  createTemplate: (
    input: CreateFiscalTemplateInput,
  ) => Promise<FiscalServiceInvoiceTemplate>;
  findDocumentById: (
    input: ScopedDocumentInput,
  ) => Promise<FiscalDocument | null>;
  getOverview: (input: FiscalScopeInput) => Promise<FiscalOverview>;
  getDocument: (input: ScopedDocumentInput) => Promise<FiscalDocument | null>;
  getRecipient: (
    input: ScopedIdInput,
  ) => Promise<FiscalServiceRecipient | null>;
  getTemplate: (
    input: ScopedIdInput,
  ) => Promise<FiscalServiceInvoiceTemplate | null>;
  listRecipients: (
    input: FiscalScopeInput,
  ) => Promise<readonly FiscalServiceRecipient[]>;
  listTemplates: (
    input: ListFiscalTemplatesInput,
  ) => Promise<readonly FiscalServiceInvoiceTemplate[]>;
  upsertProviderDocument: (
    input: UpsertProviderFiscalDocumentInput,
  ) => Promise<FiscalDocument>;
  updateDocumentStatus: (
    input: UpdateFiscalDocumentStatusInput,
  ) => Promise<FiscalDocument>;
  updateRecipient: (
    input: UpdateFiscalRecipientInput,
  ) => Promise<FiscalServiceRecipient>;
  updateTemplate: (
    input: UpdateFiscalTemplateInput,
  ) => Promise<FiscalServiceInvoiceTemplate>;
};
