import type {
  FiscalCancelInput,
  FiscalIssueInput,
  FiscalProviderGateway,
  FiscalProviderStatus,
} from "../../../../domains/fiscal/ports/fiscalProviderGateway.js";

export function createMemoryFiscalProviderGateway(
  configured = false,
): FiscalProviderGateway {
  return {
    async cancelDocument(input) {
      return {
        accessKey: null,
        providerDocumentId: input.providerDocumentId,
        status: "cancelled",
      };
    },
    async getProviderStatus() {
      return providerStatus(configured);
    },
    async issueDocument(input) {
      return createIssueResult(input, configured);
    },
    async syncDocumentStatus(input) {
      return {
        accessKey: null,
        providerDocumentId: input.providerDocumentId,
        status: "issued",
      };
    },
  };
}

function createIssueResult(input: FiscalIssueInput, configured: boolean) {
  const prefix = configured ? "spedy" : "local-spedy";
  return {
    accessKey: configured ? `${Date.now()}${input.storeId.slice(0, 8)}` : null,
    providerDocumentId: `${prefix}_${crypto.randomUUID()}`,
    status: configured ? "issued" : "failed",
  } as const;
}

function providerStatus(configured: boolean): FiscalProviderStatus {
  return {
    configured,
    missingConfiguration: configured
      ? []
      : [
          "SPEDY_HTTP_GATEWAY",
          "SPEDY_API_URL",
          "SPEDY_API_TOKEN",
          "SPEDY_WEBHOOK_SECRET",
        ],
    provider: "spedy",
    webhookConfigured: configured,
  };
}
