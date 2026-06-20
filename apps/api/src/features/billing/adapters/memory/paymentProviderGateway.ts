import type {
  PaymentProviderGateway,
  PaymentProviderStatus,
} from "../../../../domains/billing/ports/paymentProviderGateway.js";

export function createMemoryPaymentProviderGateway(
  missingConfiguration: readonly string[] = [
    "ASAAS_API_URL",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_SECRET",
  ],
): PaymentProviderGateway {
  const configured = missingConfiguration.length === 0;
  return {
    async getProviderStatus(): Promise<PaymentProviderStatus> {
      return {
        configured,
        missingConfiguration,
        provider: "asaas",
        webhookConfigured: configured,
      };
    },
  };
}
