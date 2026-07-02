export type FiscalProvider = "spedy";

export type FiscalProviderDocumentKind = "nfe" | "nfse";

export type FiscalProviderDocumentStatus =
  | "authorized"
  | "cancelled"
  | "error"
  | "failed"
  | "issued"
  | "processing"
  | "queued"
  | "rejected";

export type FiscalIssueInput = {
  documentKind: FiscalProviderDocumentKind;
  documentType: string;
  externalReference: string;
  metadata: Record<string, unknown>;
  recipientId?: string | null;
  storeId: string;
  templateId?: string | null;
  templateVersion?: number | null;
  tenantId: string;
};

export type FiscalIssueResult = {
  accessKey: string | null;
  providerDocumentId: string;
  rawResponse?: Record<string, unknown>;
  status: FiscalProviderDocumentStatus;
};

export type FiscalCancelInput = {
  providerDocumentId: string;
  reason: string;
  storeId: string;
  tenantId: string;
};

export type FiscalStatusResult = {
  accessKey: string | null;
  providerDocumentId: string;
  rawResponse?: Record<string, unknown>;
  status: FiscalProviderDocumentStatus;
};

export type FiscalProviderGateway = {
  cancelDocument: (input: FiscalCancelInput) => Promise<FiscalStatusResult>;
  getProviderStatus: () => Promise<FiscalProviderStatus>;
  issueDocument: (input: FiscalIssueInput) => Promise<FiscalIssueResult>;
  syncDocumentStatus: (input: {
    providerDocumentId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalStatusResult>;
};

export type FiscalProviderStatus = {
  configured: boolean;
  missingConfiguration: readonly string[];
  provider: FiscalProvider;
  webhookConfigured: boolean;
};
