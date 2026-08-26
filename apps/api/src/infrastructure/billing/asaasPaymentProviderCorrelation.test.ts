import { describe, expect, it, vi } from "vitest";
import { createAsaasPaymentProviderGateway } from "./asaasPaymentProviderGateway.js";

describe("Asaas payment correlation", () => {
  it("repairs a checkout without subscription identity from the checkout session", async () => {
    const fetcher = createFetchSequence([
      { id: "pay_real" },
      {
        data: [
          {
            checkoutSession: "chk_real",
            customer: "cus_real",
            externalReference: "hire_1",
            id: "pay_real",
            subscription: "sub_real",
          },
        ],
      },
    ]);
    const gateway = createGateway(fetcher.fetcher);

    await expect(
      gateway.lookupPaymentCorrelation?.({
        externalReference: "hire_1",
        providerCheckoutId: "chk_real",
        providerPaymentId: "pay_real",
      }),
    ).resolves.toEqual({
      externalReference: "hire_1",
      providerCheckoutId: "chk_real",
      providerCustomerId: "cus_real",
      providerPaymentId: "pay_real",
      providerSubscriptionId: "sub_real",
    });
    expect(fetcher.calls).toEqual([
      "https://api-sandbox.asaas.com/v3/payments/pay_real",
      "https://api-sandbox.asaas.com/v3/payments?checkoutSession=chk_real&limit=2",
    ]);
  });

  it("uses subscription payments only after bounded checkout and reference lookups", async () => {
    const fetcher = createFetchSequence([
      { id: "pay_real" },
      { data: [] },
      { data: [{ id: "ambiguous_1" }, { id: "ambiguous_2" }] },
      {
        data: [
          {
            customer: "cus_real",
            id: "pay_real",
            subscription: "sub_real",
          },
        ],
      },
    ]);
    const gateway = createGateway(fetcher.fetcher);

    await expect(
      gateway.lookupPaymentCorrelation?.({
        externalReference: "hire_1",
        providerCheckoutId: "chk_real",
        providerPaymentId: "pay_real",
        providerSubscriptionId: "sub_real",
      }),
    ).resolves.toMatchObject({
      providerPaymentId: "pay_real",
      providerSubscriptionId: "sub_real",
    });
    expect(fetcher.calls.at(-1)).toBe(
      "https://api-sandbox.asaas.com/v3/subscriptions/sub_real/payments?limit=2",
    );
  });
});

function createGateway(fetcher: typeof fetch) {
  return createAsaasPaymentProviderGateway(
    {
      ASAAS_API_KEY: "token",
      ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
      ASAAS_RUNTIME_IMPLEMENTATION: "http",
      ASAAS_WEBHOOK_SECRET: "secret",
      ASAAS_WEBHOOK_URL:
        "https://api.example.com/api/v1/billing/webhooks/asaas",
      PUBLIC_APP_URL: "https://app.example.com",
    },
    { fetcher },
  );
}

function createFetchSequence(responses: readonly Record<string, unknown>[]) {
  const calls: string[] = [];
  const queue = [...responses];
  return {
    calls,
    fetcher: vi.fn(async (input: URL | RequestInfo) => {
      calls.push(input.toString());
      return new Response(JSON.stringify(queue.shift() ?? {}), {
        status: 200,
      });
    }) as typeof fetch,
  };
}
