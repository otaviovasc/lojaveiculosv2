import type { PaymentProviderGateway } from "../../domains/billing/ports/paymentProviderGateway.js";
import { getAsaasProviderStatus } from "./asaasPaymentProviderConfig.js";
import { createAsaasClient } from "./asaasPaymentProviderHttp.js";
import {
  createAsaasCheckout,
  syncAsaasCustomer,
  syncAsaasSubscription,
} from "./asaasPaymentProviderSync.js";

export function createAsaasPaymentProviderGateway(
  env: Record<string, string | undefined>,
  options: { fetcher?: typeof fetch } = {},
): PaymentProviderGateway {
  const fetcher = options.fetcher ?? fetch;
  return {
    async createCheckout(input) {
      return createAsaasCheckout(createAsaasClient(env, fetcher), input);
    },
    async getProviderStatus() {
      return getAsaasProviderStatus(env);
    },
    async syncCustomer(input) {
      return syncAsaasCustomer(createAsaasClient(env, fetcher), input);
    },
    async syncSubscription(input) {
      return syncAsaasSubscription(createAsaasClient(env, fetcher), input);
    },
    verifyWebhookToken(token) {
      return Boolean(
        env.ASAAS_WEBHOOK_SECRET && token === env.ASAAS_WEBHOOK_SECRET,
      );
    },
  };
}

export { getAsaasProviderStatus };
