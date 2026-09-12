export type FiscalProvider = "spedy";

export type FiscalProviderDocumentKind = "nfe" | "nfse";

export type FiscalArtifactFormat = "pdf" | "xml";

export type FiscalProviderArtifact = {
  bytes: Uint8Array;
  contentType: "application/pdf" | "application/xml";
};

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
  integrationId: string;
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
  documentKind: FiscalProviderDocumentKind;
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
  getProviderStatus: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalProviderStatus>;
  downloadDocumentArtifact: (input: {
    documentKind: FiscalProviderDocumentKind;
    format: FiscalArtifactFormat;
    providerDocumentId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalProviderArtifact>;
  issueDocument: (input: FiscalIssueInput) => Promise<FiscalIssueResult>;
  syncDocumentStatus: (input: {
    documentKind: FiscalProviderDocumentKind;
    providerDocumentId: string;
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalStatusResult>;
};

export class FiscalArtifactUnavailableError extends Error {
  constructor(readonly format: FiscalArtifactFormat) {
    super(
      `The official fiscal ${format.toUpperCase()} artifact is not available.`,
    );
    this.name = "FiscalArtifactUnavailableError";
  }
}

export type FiscalProviderStatus = {
  configured: boolean;
  missingConfiguration: readonly string[];
  provider: FiscalProvider;
  webhookConfigured: boolean;
};
