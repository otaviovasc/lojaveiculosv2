import type { FiscalConnectionRepository } from "./ports/fiscalConnectionRepository.js";
import type { FiscalProviderAdminGateway } from "./ports/fiscalProviderAdminGateway.js";
import type { FiscalWebhookRepository } from "./ports/fiscalWebhookRepository.js";

export function createFiscalTestAuxiliaryPorts(): {
  fiscalConnectionRepository: FiscalConnectionRepository;
  fiscalProviderAdminGateway: FiscalProviderAdminGateway;
  fiscalWebhookRepository: FiscalWebhookRepository;
} {
  const connections = new Map<
    string,
    Awaited<ReturnType<FiscalConnectionRepository["upsert"]>> & {
      companyApiKey?: string;
    }
  >();
  const connectionKey = (input: { storeId: string; tenantId: string }) =>
    `${input.tenantId}:${input.storeId}`;
  return {
    fiscalConnectionRepository: {
      async findByCompanyId(companyId) {
        return (
          [...connections.values()].find(
            (connection) => connection.companyId === companyId,
          ) ?? null
        );
      },
      async get(input) {
        return connections.get(connectionKey(input)) ?? null;
      },
      async getCompanyApiKey(input) {
        return connections.get(connectionKey(input))?.companyApiKey ?? null;
      },
      async upsert(input) {
        const key = connectionKey(input);
        const current = connections.get(key);
        const connection = {
          capabilities: input.capabilities ?? current?.capabilities ?? {},
          certificateExpiresAt:
            input.certificateExpiresAt ?? current?.certificateExpiresAt ?? null,
          companyId: input.companyId ?? current?.companyId ?? null,
          defaultsConfirmedAt:
            input.defaultsConfirmedAt ?? current?.defaultsConfirmedAt ?? null,
          defaultsConfirmedBy:
            input.defaultsConfirmedBy ?? current?.defaultsConfirmedBy ?? null,
          defaultsStatus:
            input.defaultsStatus ?? current?.defaultsStatus ?? "missing",
          issuerProfile: input.issuerProfile ?? current?.issuerProfile ?? {},
          lastErrorCode: input.lastErrorCode ?? current?.lastErrorCode ?? null,
          lastSyncedAt: input.lastSyncedAt ?? current?.lastSyncedAt ?? null,
          provider: "spedy" as const,
          status: input.status ?? current?.status ?? "not_configured",
          storeId: input.storeId,
          taxDefaults: input.taxDefaults ?? current?.taxDefaults ?? {},
          tenantId: input.tenantId,
          webhookRegisteredAt:
            input.webhookRegisteredAt ?? current?.webhookRegisteredAt ?? null,
          ...(input.companyApiKey
            ? { companyApiKey: input.companyApiKey }
            : current?.companyApiKey
              ? { companyApiKey: current.companyApiKey }
              : {}),
        };
        connections.set(key, connection);
        return connection;
      },
    },
    fiscalProviderAdminGateway: {
      async ensureCompany(input) {
        return {
          apiKey: "test-company-api-key",
          companyId: "test-company",
          created: true,
          profile: input,
        };
      },
      async ensureWebhook() {
        return { registered: true };
      },
      async syncCompany() {
        return {
          capabilities: {},
          certificateExpiresAt: null,
          profile: {},
          settings: {},
        };
      },
      async uploadCertificate() {
        return { expirationAt: null };
      },
      verifyWebhookToken: () => true,
    },
    fiscalWebhookRepository: {
      async recordReceived(input) {
        return {
          created: true,
          event: {
            id: `event_${input.providerEventId}`,
            providerEventId: input.providerEventId,
            status: "received",
          },
        };
      },
      async updateStatus() {},
    },
  };
}
