import type { FiscalConnection } from "./types";

/** Complete nested defaults as imported from the Spedy provider. */
export function createImportedTaxDefaults(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> & {
  nfe: Record<string, unknown>;
  nfse: Record<string, unknown>;
} {
  return {
    nfe: {
      cfop: 5102,
      cofinsCst: "01",
      destination: "internal",
      icmsCst: "00",
      icmsOrigin: 0,
      isFinalCustomer: true,
      ncm: "8703",
      operationNature: "Venda de veículo",
      operationType: "outgoing",
      pisCst: "01",
      presenceType: "presence",
      purposeType: "normal",
    },
    nfse: {
      taxLocation: "companyMunicipality",
      taxationType: "taxationInMunicipality",
    },
    ...overrides,
  };
}

/** Shared test fixture for a store fiscal provider connection. */
export function createConnection(
  overrides: Partial<FiscalConnection> = {},
): FiscalConnection {
  return {
    capabilities: {},
    certificateExpiresAt: null,
    companyId: null,
    defaultsConfirmedAt: null,
    defaultsConfirmedBy: null,
    defaultsStatus: "missing",
    issuerProfile: {},
    lastErrorCode: null,
    lastSyncedAt: null,
    provider: "spedy",
    status: "not_configured",
    taxDefaults: {},
    webhookRegisteredAt: null,
    ...overrides,
  };
}
