import type {
  PaymentProviderCustomerInput,
  PaymentProviderCustomerResult,
  PaymentProviderGateway,
  PaymentProviderSubscriptionInput,
  PaymentProviderSubscriptionResult,
  PaymentProviderStatus,
} from "../../../../domains/billing/ports/paymentProviderGateway.js";

export function createMemoryPaymentProviderGateway(
  missingConfiguration: readonly string[] = [
    "ASAAS_API_URL",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_SECRET",
  ],
  webhookSecret = "test_asaas_webhook_secret_0000000000",
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
    async syncCustomer(
      input: PaymentProviderCustomerInput,
    ): Promise<PaymentProviderCustomerResult> {
      return {
        created: !input.existingProviderCustomerId,
        provider: "asaas",
        providerCustomerId:
          input.existingProviderCustomerId ?? "cus_memory_asaas",
      };
    },
    async syncSubscription(
      input: PaymentProviderSubscriptionInput,
    ): Promise<PaymentProviderSubscriptionResult> {
      return {
        created: !input.existingProviderSubscriptionId,
        currentPeriodEnd: nextMonthlyPeriodEnd(input.nextDueDate),
        provider: "asaas",
        providerSubscriptionId:
          input.existingProviderSubscriptionId ?? "sub_memory_asaas",
        status: "ACTIVE",
      };
    },
    verifyWebhookToken(token) {
      return token === webhookSecret;
    },
  };
}

function nextMonthlyPeriodEnd(date: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCMonth(parsed.getUTCMonth() + 1);
  return parsed;
}
