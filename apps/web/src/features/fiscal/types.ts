export type FiscalAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type FiscalDocument = {
  accessKey: string | null;
  createdAt: string;
  documentType: string;
  id: string;
  issuedAt: string | null;
  metadata: Record<string, unknown>;
  provider: "spedy";
  providerDocumentId: string | null;
  status: "cancelled" | "draft" | "failed" | "issued";
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
  documentType: string;
  externalReference: string;
  metadata?: Record<string, unknown>;
};
