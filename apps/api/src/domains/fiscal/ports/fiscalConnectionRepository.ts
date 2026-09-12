export type FiscalConnectionStatus =
  "error" | "not_configured" | "pending_review" | "ready";

export type FiscalDefaultsStatus = "confirmed" | "missing" | "unconfirmed";

export type FiscalConnection = {
  capabilities: Record<string, unknown>;
  certificateExpiresAt: Date | null;
  companyId: string | null;
  defaultsConfirmedAt: Date | null;
  defaultsConfirmedBy: string | null;
  defaultsStatus: FiscalDefaultsStatus;
  issuerProfile: Record<string, unknown>;
  lastErrorCode: string | null;
  lastSyncedAt: Date | null;
  provider: "spedy";
  status: FiscalConnectionStatus;
  storeId: string;
  taxDefaults: Record<string, unknown>;
  tenantId: string;
  webhookRegisteredAt: Date | null;
};

export type FiscalConnectionSecret = FiscalConnection & {
  credentialCiphertext: string | null;
};

export type UpsertFiscalConnectionInput = {
  capabilities?: Record<string, unknown>;
  certificateExpiresAt?: Date | null;
  companyApiKey?: string;
  companyId?: string | null;
  defaultsConfirmedAt?: Date | null;
  defaultsConfirmedBy?: string | null;
  defaultsStatus?: FiscalDefaultsStatus;
  issuerProfile?: Record<string, unknown>;
  lastErrorCode?: string | null;
  lastSyncedAt?: Date | null;
  status?: FiscalConnectionStatus;
  storeId: string;
  taxDefaults?: Record<string, unknown>;
  tenantId: string;
  webhookRegisteredAt?: Date | null;
};

export type FiscalConnectionRepository = {
  findByCompanyId: (companyId: string) => Promise<FiscalConnection | null>;
  get: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<FiscalConnection | null>;
  getCompanyApiKey: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<string | null>;
  upsert: (input: UpsertFiscalConnectionInput) => Promise<FiscalConnection>;
};
