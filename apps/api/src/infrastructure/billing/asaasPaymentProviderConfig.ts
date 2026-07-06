import type { PaymentProviderStatus } from "../../domains/billing/ports/paymentProviderGateway.js";

const requiredAsaasKeys = [
  "ASAAS_RUNTIME_IMPLEMENTATION",
  "ASAAS_API_URL",
  "ASAAS_API_KEY",
] as const;

export function getAsaasProviderStatus(
  env: Record<string, string | undefined>,
): PaymentProviderStatus {
  const missingConfiguration = [
    ...requiredAsaasKeys.filter((key) => !env[key]),
    ...(env.ASAAS_RUNTIME_IMPLEMENTATION &&
    env.ASAAS_RUNTIME_IMPLEMENTATION !== "http"
      ? ["ASAAS_RUNTIME_IMPLEMENTATION=http"]
      : []),
    ...(env.ASAAS_WEBHOOK_SECRET ? [] : ["ASAAS_WEBHOOK_SECRET"]),
  ];

  return {
    configured: missingConfiguration.length === 0,
    missingConfiguration,
    provider: "asaas",
    webhookConfigured: Boolean(env.ASAAS_WEBHOOK_SECRET),
  };
}
