export type FiscalAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

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
  createdAt: string;
  documentKind: "nfe" | "nfse";
  documentType: string;
  id: string;
  issuedAt: string | null;
  metadata: Record<string, unknown>;
  provider: "spedy";
  providerDocumentId: string | null;
  recipientId: string | null;
  status: FiscalDocumentStatus;
  templateId: string | null;
  templateVersion: number | null;
};

export type FiscalRecipient = {
  address: Record<string, unknown>;
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
  tradeName: string | null;
};

export type FiscalTemplate = {
  descriptionTemplate: string;
  id: string;
  isActive: boolean;
  isDefaultForRecipient: boolean;
  name: string;
  recipientId: string | null;
  requirements: Record<string, unknown>;
  retentionConfig: Record<string, unknown>;
  serviceMunicipalCode: string | null;
  serviceNationalCode: string;
  taxConfig: Record<string, unknown>;
  useCase: string;
  version: number;
};

export type FiscalOverview = {
  documents: FiscalDocument[];
  provider: {
    configured: boolean;
    missingConfiguration: readonly string[];
    provider: "spedy";
    webhookConfigured: boolean;
  };
  summary: {
    cancelled: number;
    failed: number;
    issued: number;
    pending: number;
  };
};

export type IssueFiscalDocumentInput = {
  documentKind?: "nfe" | "nfse";
  documentType: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
  recipientId?: string | null;
  templateId?: string | null;
  templateVariables?: Record<string, unknown>;
};

export type PreviewTemplateResult = {
  renderedDescription: string;
  templateId: string;
  unresolvedVariables: readonly string[];
  usedVariables: readonly string[];
  version: number;
};
