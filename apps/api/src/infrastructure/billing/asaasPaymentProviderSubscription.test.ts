import { describe, expect, it, vi } from "vitest";
import type { PaymentProviderSubscriptionInput } from "../../domains/billing/ports/paymentProviderGateway.js";
import { createAsaasPaymentProviderGateway } from "./asaasPaymentProviderGateway.js";

describe("Asaas subscription correlation", () => {
  it("reuses the unique subscription found by external reference", async () => {
    const fetcher = sequenceFetcher([
      { data: [{ externalReference: "hire_1", id: "sub_existing" }] },
      subscription("sub_existing"),
    ]);

    await expect(sync(fetcher.fetcher)).resolves.toMatchObject({
      created: false,
      providerSubscriptionId: "sub_existing",
    });
    expect(fetcher.calls.map((call) => call.method)).toEqual(["GET", "PUT"]);
    expect(fetcher.calls[1]?.url).toContain("/subscriptions/sub_existing");
  });

  it("blocks an ambiguous external reference instead of creating another subscription", async () => {
    const fetcher = sequenceFetcher([
      { data: [{ id: "sub_1" }, { id: "sub_2" }] },
    ]);

    await expect(sync(fetcher.fetcher)).rejects.toMatchObject({
      code: "asaas_subscription_correlation_ambiguous",
      status: 409,
    });
    expect(fetcher.calls).toHaveLength(1);
  });

  it("treats a truncated subscription page as ambiguous", async () => {
    const fetcher = sequenceFetcher([
      { data: [{ id: "sub_1" }], hasMore: true },
    ]);

    await expect(sync(fetcher.fetcher)).rejects.toMatchObject({
      code: "asaas_subscription_correlation_ambiguous",
      status: 409,
    });
    expect(fetcher.calls).toHaveLength(1);
  });

  it("rejects a provider row outside the requested external reference", async () => {
    const fetcher = sequenceFetcher([
      { data: [{ externalReference: "hire_other", id: "sub_other" }] },
    ]);

    await expect(sync(fetcher.fetcher)).rejects.toMatchObject({
      code: "asaas_subscription_correlation_ambiguous",
      status: 409,
    });
    expect(fetcher.calls).toHaveLength(1);
  });

  it("rejects a PUT response with a different subscription identity", async () => {
    const fetcher = sequenceFetcher([
      { data: [{ externalReference: "hire_1", id: "sub_existing" }] },
      subscription("sub_different"),
    ]);

    await expect(sync(fetcher.fetcher)).rejects.toMatchObject({
      code: "asaas_subscription_identity_mismatch",
      status: 409,
    });
    expect(fetcher.calls.map((call) => call.method)).toEqual(["GET", "PUT"]);
  });

  it("discovers a committed subscription after the create response is lost", async () => {
    const fetcher = sequenceFetcher([
      { data: [] },
      new TypeError("transport closed after commit"),
      { data: [{ externalReference: "hire_1", id: "sub_committed" }] },
      subscription("sub_committed"),
    ]);

    await expect(sync(fetcher.fetcher)).rejects.toThrow(
      "transport closed after commit",
    );
    await expect(sync(fetcher.fetcher)).resolves.toMatchObject({
      created: false,
      providerSubscriptionId: "sub_committed",
    });
    expect(fetcher.calls.map((call) => call.method)).toEqual([
      "GET",
      "POST",
      "GET",
      "PUT",
    ]);
  });
});

const input: PaymentProviderSubscriptionInput = {
  billingType: "PIX",
  customerId: "cus_1",
  description: "Plano Essencial",
  externalReference: "hire_1",
  nextDueDate: "2026-09-25",
  updatePendingPayments: false,
  valueCents: 19_700,
};

function sync(fetcher: typeof fetch) {
  return createAsaasPaymentProviderGateway(config, {
    fetcher,
  }).syncSubscription?.(input);
}

function subscription(id: string) {
  return { id, nextDueDate: "2026-10-25", status: "ACTIVE" };
}

const config = {
  ASAAS_API_KEY: "token",
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
  ASAAS_RUNTIME_IMPLEMENTATION: "http",
  ASAAS_WEBHOOK_SECRET: "secret",
  ASAAS_WEBHOOK_URL: "https://api.example.test/webhooks/asaas",
  PUBLIC_APP_URL: "https://app.example.test",
};

function sequenceFetcher(
  responses: readonly (Record<string, unknown> | Error)[],
) {
  const calls: { method: string; url: string }[] = [];
  const queue = [...responses];
  const fetcher = vi.fn(
    async (request: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", url: request.toString() });
      const response = queue.shift() ?? {};
      if (response instanceof Error) throw response;
      return new Response(JSON.stringify(response), { status: 200 });
    },
  ) as typeof fetch;
  return { calls, fetcher };
}
