import { describe, expect, it, vi } from "vitest";
import { createAsaasPaymentProviderGateway } from "./asaasPaymentProviderGateway.js";

const longCheckoutDescription =
  "Plano mensal com acesso ao console operacional da loja e aos recursos " +
  "essenciais de faturamento, estoque e CRM";

describe("createAsaasPaymentProviderGateway checkout", () => {
  it("creates hosted Asaas recurring checkouts", async () => {
    const fetcher = createFetchSequence([
      {
        id: "chk_created",
        link: "https://sandbox.asaas.com/checkoutSession/show/chk_created",
      },
    ]);
    const gateway = createAsaasPaymentProviderGateway(
      {
        ASAAS_API_KEY: "token",
        ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
        ASAAS_RUNTIME_IMPLEMENTATION: "http",
        ASAAS_WEBHOOK_SECRET: "secret",
        ASAAS_WEBHOOK_URL:
          "https://api.example.com/api/v1/billing/webhooks/asaas",
        PUBLIC_APP_URL: "https://app.example.com",
      },
      { fetcher: fetcher.fetcher },
    );

    await expect(
      gateway.createCheckout?.({
        billingTypes: ["CREDIT_CARD"],
        callback: {
          cancelUrl: "https://app.example.com/billing?checkout=cancelled",
          expiredUrl: "https://app.example.com/billing?checkout=expired",
          successUrl: "https://app.example.com/billing?checkout=success",
        },
        externalReference:
          "lojaveiculos:subscription:subscription_1:checkout:1",
        items: [
          {
            description: longCheckoutDescription,
            name: "Plano Growth Loja Veiculos OS Completo",
            quantity: 1,
            valueCents: 29900,
          },
        ],
        minutesToExpire: 60,
        nextDueDate: "2026-07-10",
      }),
    ).resolves.toMatchObject({
      checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show/chk_created",
      providerCheckoutId: "chk_created",
    });
    expect(fetcher.calls[0]).toMatchObject({
      body: {
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        externalReference:
          "lojaveiculos:subscription:subscription_1:checkout:1",
        items: [
          {
            description: longCheckoutDescription,
            name: "Plano Growth Loja Veiculos OS",
            quantity: 1,
            value: 299,
          },
        ],
        minutesToExpire: 60,
        subscription: {
          cycle: "MONTHLY",
          nextDueDate: "2026-07-10",
        },
      },
      method: "POST",
    });
    expect(fetcher.calls[0]?.body).not.toHaveProperty("customerData");
    expect(fetcher.calls[0]?.url).toContain("/checkouts");
  });
});

function createFetchSequence(responses: readonly Record<string, unknown>[]) {
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
