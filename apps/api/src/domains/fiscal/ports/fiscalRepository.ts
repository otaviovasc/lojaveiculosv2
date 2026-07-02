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

export type FiscalServiceRecipient = {
  address: Record<string, unknown>;
  createdAt: Date;
  defaultServiceTemplateId: string | null;
  documentNumber: string;
  documentType: "cnpj" | "cpf";
  email: string | null;
  id: string;
  isActive: boolean;
  legalName: string;
  municipalRegistration: string | null;
  notes: string | null;
  phone: string | null;
  stateRegistration: string | null;
  storeId: string;
  tenantId: string;
  tradeName: string | null;
  updatedAt: Date;
};

export type FiscalServiceTemplateUseCase =
  | "administrative_service"
  | "bank_marketing"
  | "consortium_commission"
  | "financing_commission"
  | "financing_intermediation"
  | "insurance_commission"
  | "other"
  | "vehicle_documentation_service"
  | "warranty_commission";

export type FiscalServiceInvoiceTemplate = {
  cityServiceCode: string | null;
  createdAt: Date;
  defaultMunicipalityOfIncidence: string | null;
  defaultServiceLocation: string | null;
  defaultTaxationType: string | null;
  descriptionTemplate: string;
  id: string;
  includeApproximateTaxes: boolean;
  isActive: boolean;
  isDefaultForRecipient: boolean;
  name: string;
  recipientId: string | null;
  requirements: Record<string, unknown>;
  retentionConfig: Record<string, unknown>;
  serviceMunicipalCode: string | null;
  serviceNationalCode: string;
  storeId: string;
  taxConfig: Record<string, unknown>;
  tenantId: string;
  updatedAt: Date;
  useCase: FiscalServiceTemplateUseCase;
  version: number;
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

export type CreateFiscalRecipientInput = {
  address?: Record<string, unknown> | undefined;
  defaultServiceTemplateId?: string | null | undefined;
  documentNumber: string;
  documentType: "cnpj" | "cpf";
  email?: string | null | undefined;
  isActive?: boolean | undefined;
  legalName: string;
  municipalRegistration?: string | null | undefined;
  notes?: string | null | undefined;
  phone?: string | null | undefined;
  stateRegistration?: string | null | undefined;
  storeId: string;
  tenantId: string;
  tradeName?: string | null | undefined;
};

export type UpdateFiscalRecipientInput = Partial<
  Omit<CreateFiscalRecipientInput, "storeId" | "tenantId">
> & {
  id: string;
  storeId: string;
  tenantId: string;
};

export type CreateFiscalTemplateInput = {
  cityServiceCode?: string | null | undefined;
  defaultMunicipalityOfIncidence?: string | null | undefined;
  defaultServiceLocation?: string | null | undefined;
  defaultTaxationType?: string | null | undefined;
  descriptionTemplate: string;
  includeApproximateTaxes?: boolean | undefined;
  isActive?: boolean | undefined;
  isDefaultForRecipient?: boolean | undefined;
  name: string;
  recipientId?: string | null | undefined;
  requirements?: Record<string, unknown> | undefined;
  retentionConfig?: Record<string, unknown> | undefined;
  serviceMunicipalCode?: string | null | undefined;
  serviceNationalCode: string;
  storeId: string;
  taxConfig?: Record<string, unknown> | undefined;
  tenantId: string;
  useCase: FiscalServiceTemplateUseCase;
  version?: number | undefined;
};

export type UpdateFiscalTemplateInput = Partial<
  Omit<CreateFiscalTemplateInput, "storeId" | "tenantId">
> & {
  id: string;
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
