import type { FiscalProviderAdminGateway } from "../../../../domains/fiscal/ports/fiscalProviderAdminGateway.js";

export function createMemoryFiscalProviderAdminGateway(): FiscalProviderAdminGateway {
  return {
    async ensureCompany(input) {
      return {
        apiKey: "memory-company-api-key",
        companyId: crypto.randomUUID(),
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
  };
}
