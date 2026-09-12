import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentProviderGateway } from "../../domains/billing/ports/paymentProviderGateway.js";
import { getAsaasProviderStatus } from "./asaasPaymentProviderConfig.js";
import { createAsaasClient } from "./asaasPaymentProviderHttp.js";
import {
  cancelAsaasSubscription,
  createAsaasCheckout,
  lookupAsaasPaymentCorrelation,
  syncAsaasCustomer,
  syncAsaasSubscription,
} from "./asaasPaymentProviderSync.js";

export function createAsaasPaymentProviderGateway(
  env: Record<string, string | undefined>,
  options: { fetcher?: typeof fetch } = {},
): PaymentProviderGateway {
  const fetcher = options.fetcher ?? fetch;
  return {
    cancelSubscription: (providerSubscriptionId) =>
      cancelAsaasSubscription(
        createAsaasClient(env, fetcher),
        providerSubscriptionId,
      ),
    async createCheckout(input) {
      return createAsaasCheckout(createAsaasClient(env, fetcher), input);
    },
    async getProviderStatus() {
      return getAsaasProviderStatus(env);
    },
    async lookupPaymentCorrelation(input) {
      return lookupAsaasPaymentCorrelation(
        createAsaasClient(env, fetcher),
        input,
      );
    },
    async syncCustomer(input) {
      return syncAsaasCustomer(createAsaasClient(env, fetcher), input);
    },
    async syncSubscription(input) {
      return syncAsaasSubscription(createAsaasClient(env, fetcher), input);
    },
    verifyWebhookToken(token) {
      return verifyAsaasWebhookToken(env.ASAAS_WEBHOOK_SECRET, token);
    },
  };
}

export function verifyAsaasWebhookToken(
  configuredSecret: string | undefined,
  token: string | null,
) {
  const expected = tokenDigest(configuredSecret ?? "");
  const received = tokenDigest(token ?? "");
  return (
    Boolean(configuredSecret && token) && timingSafeEqual(expected, received)
  );
}

function tokenDigest(value: string) {
  return createHash("sha256").update(`asaas-webhook\0${value}`).digest();
}

export { getAsaasProviderStatus };
