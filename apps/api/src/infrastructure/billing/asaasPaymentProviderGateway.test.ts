import { describe, expect, it, vi } from "vitest";
import {
  createAsaasPaymentProviderGateway,
  getAsaasProviderStatus,
} from "./asaasPaymentProviderGateway.js";

describe("getAsaasProviderStatus", () => {
  it("requires the explicit HTTP runtime and provider credentials", () => {
    expect(getAsaasProviderStatus({})).toEqual({
      configured: false,
      missingConfiguration: [
        "ASAAS_RUNTIME_IMPLEMENTATION",
        "ASAAS_API_URL",
        "ASAAS_API_KEY",
        "PUBLIC_APP_URL",
        "ASAAS_WEBHOOK_SECRET",
        "ASAAS_WEBHOOK_URL",
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
        ASAAS_WEBHOOK_URL:
          "https://api.example.com/api/v1/billing/webhooks/asaas",
        PUBLIC_APP_URL: "https://app.example.com",
      }),
    ).toEqual({
      configured: true,
      missingConfiguration: [],
      provider: "asaas",
      webhookConfigured: true,
    });
  });

  it("verifies Asaas webhook tokens without exposing the secret", () => {
    const gateway = createAsaasPaymentProviderGateway({
      ASAAS_WEBHOOK_SECRET: "secret",
    });

    expect(gateway.verifyWebhookToken?.("secret")).toBe(true);
    expect(gateway.verifyWebhookToken?.("wrong")).toBe(false);
    expect(gateway.verifyWebhookToken?.(null)).toBe(false);
  });

  it("reuses an Asaas customer found by external reference", async () => {
    const fetcher = createFetchSequence([
      {
        data: [{ id: "cus_existing" }],
      },
    ]);
    const gateway = createConfiguredGateway(fetcher.fetcher);

    await expect(
      gateway.syncCustomer?.({
        documentNumber: "11222333000181",
        email: "billing-test@lojaveiculos.com.br",
        externalReference: "lojaveiculos:tenant:tenant_1",
        name: "Loja Teste LTDA",
      }),
    ).resolves.toMatchObject({
      created: false,
      providerCustomerId: "cus_existing",
    });
    expect(fetcher.calls).toHaveLength(1);
    expect(fetcher.calls[0]?.url).toContain(
      "/customers?externalReference=lojaveiculos%3Atenant%3Atenant_1&limit=1",
    );
  });

  it("creates an Asaas customer only after lookup misses", async () => {
    const fetcher = createFetchSequence([
      { data: [] },
      { data: [] },
      { id: "cus_created" },
    ]);
    const gateway = createConfiguredGateway(fetcher.fetcher);

    await expect(
      gateway.syncCustomer?.({
        documentNumber: "11.222.333/0001-81",
        email: "billing-test@lojaveiculos.com.br",
        externalReference: "lojaveiculos:tenant:tenant_1",
        name: "Loja Teste LTDA",
      }),
    ).resolves.toMatchObject({
      created: true,
      providerCustomerId: "cus_created",
    });
    expect(fetcher.calls[2]?.method).toBe("POST");
    expect(fetcher.calls[2]?.url).toContain("/customers");
    expect(fetcher.calls[2]?.body).toMatchObject({
      cpfCnpj: "11222333000181",
      externalReference: "lojaveiculos:tenant:tenant_1",
      name: "Loja Teste LTDA",
    });
  });

  it("creates and updates Asaas monthly subscriptions", async () => {
    const createFetcher = createFetchSequence([
      { id: "sub_created", nextDueDate: "2026-08-10", status: "ACTIVE" },
    ]);
    const createGateway = createConfiguredGateway(createFetcher.fetcher);

    await expect(
      createGateway.syncSubscription?.({
        billingType: "PIX",
        customerId: "cus_1",
        description: "Loja Veiculos OS: Growth",
        externalReference: "lojaveiculos:subscription:subscription_1",
        nextDueDate: "2026-07-10",
        updatePendingPayments: true,
        valueCents: 54899,
      }),
    ).resolves.toMatchObject({
      created: true,
      providerSubscriptionId: "sub_created",
      status: "ACTIVE",
    });
    expect(createFetcher.calls[0]).toMatchObject({
      method: "POST",
      body: {
        billingType: "PIX",
        customer: "cus_1",
        cycle: "MONTHLY",
        updatePendingPayments: true,
        value: 548.99,
      },
    });

    const updateFetcher = createFetchSequence([
      { id: "sub_created", nextDueDate: "2026-08-10", status: "ACTIVE" },
    ]);
    const updateGateway = createConfiguredGateway(updateFetcher.fetcher);

    await expect(
      updateGateway.syncSubscription?.({
        billingType: "PIX",
        customerId: "cus_1",
        description: "Loja Veiculos OS: Growth",
        existingProviderSubscriptionId: "sub_created",
        externalReference: "lojaveiculos:subscription:subscription_1",
        nextDueDate: "2026-07-10",
        updatePendingPayments: false,
        valueCents: 54899,
      }),
    ).resolves.toMatchObject({ created: false });
    expect(updateFetcher.calls[0]?.method).toBe("PUT");
    expect(updateFetcher.calls[0]?.body).toMatchObject({
      updatePendingPayments: false,
    });
    expect(updateFetcher.calls[0]?.url).toContain("/subscriptions/sub_created");
  });
});

function createConfiguredGateway(fetcher: typeof fetch) {
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

function createFetchSequence(responses: readonly Record<string, unknown>[]): {
  calls: {
    body: Record<string, unknown> | null;
    method: string;
    url: string;
  }[];
  fetcher: typeof fetch;
} {
  const calls: {
    body: Record<string, unknown> | null;
    method: string;
    url: string;
  }[] = [];
  const queue = [...responses];
  return {
    calls,
    fetcher: vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      calls.push({
        body:
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as Record<string, unknown>)
            : null,
        method: init?.method ?? "GET",
        url: input.toString(),
      });
      return new Response(JSON.stringify(queue.shift() ?? {}), {
        status: 200,
      });
    }) as typeof fetch,
  };
}
