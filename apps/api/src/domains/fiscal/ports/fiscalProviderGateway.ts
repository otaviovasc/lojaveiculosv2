export type FiscalProvider = "spedy";

export type FiscalIssueInput = {
  documentType: string;
  externalReference: string;
  metadata: Record<string, unknown>;
  storeId: string;
  tenantId: string;
};

export type FiscalIssueResult = {
  accessKey: string | null;
  providerDocumentId: string;
  status: "failed" | "issued";
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
  status: "cancelled" | "failed" | "issued" | "processing";
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
