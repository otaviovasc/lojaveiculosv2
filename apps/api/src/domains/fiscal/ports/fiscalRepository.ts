export type FiscalDocumentStatus = "cancelled" | "draft" | "failed" | "issued";

export type FiscalDocument = {
  accessKey: string | null;
  createdAt: Date;
  documentType: string;
  id: string;
  issuedAt: Date | null;
  metadata: Record<string, unknown>;
  provider: "spedy";
  providerDocumentId: string | null;
  status: FiscalDocumentStatus;
  storeId: string;
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
  documentType: string;
  metadata?: Record<string, unknown>;
  providerDocumentId?: string | null;
  status: FiscalDocumentStatus;
  storeId: string;
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

export type FiscalRepository = {
  createDocument: (input: CreateFiscalDocumentInput) => Promise<FiscalDocument>;
  findDocumentById: (input: {
    documentId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalDocument | null>;
  getOverview: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalOverview>;
  updateDocumentStatus: (
    input: UpdateFiscalDocumentStatusInput,
  ) => Promise<FiscalDocument>;
};
