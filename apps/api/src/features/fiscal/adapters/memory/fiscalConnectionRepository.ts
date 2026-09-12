import type {
  FiscalConnection,
  FiscalConnectionRepository,
} from "../../../../domains/fiscal/ports/fiscalConnectionRepository.js";

export function createMemoryFiscalConnectionRepository(): FiscalConnectionRepository {
  const rows = new Map<string, FiscalConnection & { companyApiKey?: string }>();
  const keyFor = (input: { storeId: string; tenantId: string }) =>
    `${input.tenantId}:${input.storeId}`;

  return {
    async findByCompanyId(companyId) {
      return (
        [...rows.values()].find((row) => row.companyId === companyId) ?? null
      );
    },
    async get(input) {
      return rows.get(keyFor(input)) ?? null;
    },
    async getCompanyApiKey(input) {
      return rows.get(keyFor(input))?.companyApiKey ?? null;
    },
    async upsert(input) {
      const key = keyFor(input);
      const current = rows.get(key);
      const row: FiscalConnection & { companyApiKey?: string } = {
        capabilities: input.capabilities ?? current?.capabilities ?? {},
        certificateExpiresAt:
          input.certificateExpiresAt !== undefined
            ? input.certificateExpiresAt
            : (current?.certificateExpiresAt ?? null),
        companyId:
          input.companyId !== undefined
            ? input.companyId
            : (current?.companyId ?? null),
        defaultsConfirmedAt:
          input.defaultsConfirmedAt !== undefined
            ? input.defaultsConfirmedAt
            : (current?.defaultsConfirmedAt ?? null),
        defaultsConfirmedBy:
          input.defaultsConfirmedBy !== undefined
            ? input.defaultsConfirmedBy
            : (current?.defaultsConfirmedBy ?? null),
        defaultsStatus:
          input.defaultsStatus ?? current?.defaultsStatus ?? "missing",
        issuerProfile: input.issuerProfile ?? current?.issuerProfile ?? {},
        lastErrorCode:
          input.lastErrorCode !== undefined
            ? input.lastErrorCode
            : (current?.lastErrorCode ?? null),
        lastSyncedAt:
          input.lastSyncedAt !== undefined
            ? input.lastSyncedAt
            : (current?.lastSyncedAt ?? null),
        provider: "spedy",
        status: input.status ?? current?.status ?? "not_configured",
        storeId: input.storeId,
        taxDefaults: input.taxDefaults ?? current?.taxDefaults ?? {},
        tenantId: input.tenantId,
        webhookRegisteredAt:
          input.webhookRegisteredAt !== undefined
            ? input.webhookRegisteredAt
            : (current?.webhookRegisteredAt ?? null),
        ...(input.companyApiKey
          ? { companyApiKey: input.companyApiKey }
          : current?.companyApiKey
            ? { companyApiKey: current.companyApiKey }
            : {}),
      };
      rows.set(key, row);
      return row;
    },
  };
}
