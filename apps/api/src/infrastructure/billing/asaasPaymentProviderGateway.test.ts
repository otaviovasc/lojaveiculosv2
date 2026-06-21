import { describe, expect, it } from "vitest";
import { getAsaasProviderStatus } from "./asaasPaymentProviderGateway.js";

describe("getAsaasProviderStatus", () => {
  it("requires the explicit HTTP runtime and provider credentials", () => {
    expect(getAsaasProviderStatus({})).toEqual({
      configured: false,
      missingConfiguration: [
        "ASAAS_RUNTIME_IMPLEMENTATION",
        "ASAAS_API_URL",
        "ASAAS_API_KEY",
        "ASAAS_WEBHOOK_SECRET",
      ],
      provider: "asaas",
      webhookConfigured: false,
    });
  });

  it("reports configured only when runtime, API, and webhook values exist", () => {
    expect(
      getAsaasProviderStatus({
        ASAAS_API_KEY: "token",
        ASAAS_API_URL: "https://sandbox.asaas.com/api/v3",
        ASAAS_RUNTIME_IMPLEMENTATION: "http",
        ASAAS_WEBHOOK_SECRET: "secret",
      }),
    ).toEqual({
      configured: true,
      missingConfiguration: [],
      provider: "asaas",
      webhookConfigured: true,
    });
  });
});
