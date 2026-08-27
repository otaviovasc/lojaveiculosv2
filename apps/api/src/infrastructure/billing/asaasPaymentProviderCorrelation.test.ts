import { describe, expect, it, vi } from "vitest";
import { createAsaasPaymentProviderGateway } from "./asaasPaymentProviderGateway.js";

describe("Asaas payment correlation", () => {
  it("continues with checkout correlation when the direct payment lookup returns 404", async () => {
    const fetcher = createFetchSequence([
      { body: { errors: [{ code: "not_found" }] }, httpStatus: 404 },
      {
        data: [
          {
            checkoutSession: "chk_404",
            customer: "cus_404",
            externalReference: "hire_404",
            id: "pay_404",
            subscription: "sub_404",
          },
        ],
      },
    ]);

    await expect(
      createGateway(fetcher.fetcher).lookupPaymentCorrelation?.({
        providerCheckoutId: "chk_404",
        providerPaymentId: "pay_404",
      }),
    ).resolves.toMatchObject({
      providerCheckoutId: "chk_404",
      providerPaymentId: "pay_404",
      providerSubscriptionId: "sub_404",
    });
  });

  it("continues with external-reference correlation when the direct lookup returns 503", async () => {
    const fetcher = createFetchSequence([
      { body: {}, httpStatus: 503 },
      {
        data: [
          {
            customer: "cus_503",
            externalReference: "hire_503",
            id: "pay_503",
            subscription: "sub_503",
          },
        ],
      },
    ]);

    await expect(
      createGateway(fetcher.fetcher).lookupPaymentCorrelation?.({
        externalReference: "hire_503",
        providerPaymentId: "pay_503",
      }),
    ).resolves.toMatchObject({
      externalReference: "hire_503",
      providerPaymentId: "pay_503",
      providerSubscriptionId: "sub_503",
    });
  });

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

  it("does not return ambiguous provider evidence", async () => {
    const duplicate = {
      checkoutSession: "chk_ambiguous",
      externalReference: "hire_ambiguous",
      id: "pay_ambiguous",
      subscription: "sub_ambiguous",
    };
    const fetcher = createFetchSequence([
      { body: {}, httpStatus: 503 },
      { data: [duplicate, duplicate] },
    ]);

    await expect(
      createGateway(fetcher.fetcher).lookupPaymentCorrelation?.({
        providerCheckoutId: "chk_ambiguous",
        providerPaymentId: "pay_ambiguous",
      }),
    ).resolves.toBeNull();
    expect(fetcher.calls).toHaveLength(2);
  });

  it("does not trust a unique row from a truncated provider page", async () => {
    const fetcher = createFetchSequence([
      { body: {}, httpStatus: 503 },
      {
        data: [
          {
            checkoutSession: "chk_truncated",
            id: "pay_truncated",
          },
        ],
        hasMore: true,
      },
    ]);

    await expect(
      createGateway(fetcher.fetcher).lookupPaymentCorrelation?.({
        providerCheckoutId: "chk_truncated",
        providerPaymentId: "pay_truncated",
      }),
    ).resolves.toBeNull();
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

type FetchSequenceResponse =
  | Record<string, unknown>
  | { body: Record<string, unknown>; httpStatus: number };

function createFetchSequence(responses: readonly FetchSequenceResponse[]) {
  const calls: string[] = [];
  const queue = [...responses];
  return {
    calls,
    fetcher: vi.fn(async (input: URL | RequestInfo) => {
      calls.push(input.toString());
      const next = queue.shift() ?? {};
      const withStatus = isHttpResponse(next);
      return new Response(JSON.stringify(withStatus ? next.body : next), {
        status: withStatus ? next.httpStatus : 200,
      });
    }) as typeof fetch,
  };
}

function isHttpResponse(
  value: FetchSequenceResponse,
): value is { body: Record<string, unknown>; httpStatus: number } {
  return (
    typeof value.httpStatus === "number" &&
    Boolean(value.body && typeof value.body === "object")
  );
}
