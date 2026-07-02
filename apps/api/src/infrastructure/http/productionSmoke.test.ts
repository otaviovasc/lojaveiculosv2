import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createAsaasPaymentProviderGateway } from "../billing/asaasPaymentProviderGateway.js";
import { createSpedyHttpFiscalProviderGateway } from "../fiscal/spedyHttpFiscalProviderGateway.js";
import { createServiceContext } from "../../shared/serviceContext.js";
import { createBillingFeature } from "../../features/billing/controllers/billing.controller.js";
import { createBillingServices } from "../../features/billing/controllers/billingServices.js";
import { createMemoryBillingRepository } from "../../features/billing/adapters/memory/billingRepository.js";
import { createFiscalFeature } from "../../features/fiscal/controllers/fiscal.controller.js";
import { createFiscalServices } from "../../features/fiscal/controllers/fiscalServices.js";
import { createMemoryFiscalRepository } from "../../features/fiscal/adapters/memory/fiscalRepository.js";
import { createInventoryTestApp } from "../../features/inventory/controllers/vehicle.controller.testSupport.js";
import { createStorefrontFeature } from "../../features/storefront/controllers/storefront.controller.js";
import {
  createCrmRepository,
  createRepository,
} from "../../features/storefront/controllers/storefront.controller.testSupport.js";
import { createInventoryTestServices } from "../../features/inventory/controllers/vehicle.controller.testSupport.js";

describe("production smoke contracts", () => {
  it("reports billing provider readiness from production env configuration", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const app = new Hono();
    app.route(
      "/api/v1/billing",
      createBillingFeature({
        contextFactory: async () =>
          createUserContext(["billing.manage"], audit),
        services: createBillingServices({
          ports: {
            billingRepository: createMemoryBillingRepository(),
            paymentProviderGateway: createAsaasPaymentProviderGateway({
              ASAAS_API_KEY: "token",
              ASAAS_API_URL: "https://sandbox.asaas.com/api/v3",
              ASAAS_RUNTIME_IMPLEMENTATION: "http",
              ASAAS_WEBHOOK_SECRET: "secret",
              ASAAS_WEBHOOK_URL:
                "https://api.example.com/api/v1/billing/webhooks/asaas",
              PUBLIC_APP_URL: "https://app.example.com",
            }),
          },
        }),
      }),
    );

    const response = await app.request("/api/v1/billing/provider/status");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      configured: true,
      missingConfiguration: [],
      provider: "asaas",
      webhookConfigured: true,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.provider_status.read",
        outcome: "succeeded",
      }),
    );
  });

  it("fails fiscal issue requests when the HTTP provider is enabled but incomplete", async () => {
    const app = new Hono();
    app.route(
      "/api/v1/fiscal",
      createFiscalFeature({
        contextFactory: async () =>
          createUserContext(
            ["fiscal.manage", "fiscal.document.issue"],
            undefined,
            ["nfe"],
          ),
        services: createFiscalServices({
          fiscalProviderGateway: createSpedyHttpFiscalProviderGateway({
            env: { SPEDY_RUNTIME_IMPLEMENTATION: "http" },
          }),
          fiscalRepository: createMemoryFiscalRepository(),
        }),
      }),
    );

    const response = await app.request("/api/v1/fiscal/documents", {
      body: JSON.stringify({
        documentType: "nfe",
        externalReference: "sale_1",
      }),
      method: "POST",
    });

    expect(response.status).toBe(503);
    const body = (await response.json()) as {
      code?: string;
      message?: string;
      requestId?: unknown;
    };
    expect(body).toMatchObject({
      code: "FISCAL_PROVIDER_UNAVAILABLE",
      message:
        "SPEDY fiscal gateway is not configured: SPEDY_API_URL, SPEDY_API_TOKEN, SPEDY_WEBHOOK_SECRET, SPEDY_ISSUE_PATH or SPEDY_NFE_ISSUE_PATH/SPEDY_NFSE_ISSUE_PATH, SPEDY_CANCEL_PATH, SPEDY_STATUS_PATH",
    });
    expect(typeof body.requestId).toBe("string");
  });

  it("keeps inventory unit reserve, sell, and release routes wired before production rollout", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const reserveResponse = await app.request(
      "/api/v1/inventory/units/unit_1/reserve",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
          signalAmountCents: 100000,
        }),
        method: "POST",
      },
    );
    const sellResponse = await app.request(
      "/api/v1/inventory/units/unit_1/sell",
      {
        body: JSON.stringify({
          buyer: { name: "Buyer" },
          paymentMethod: "pix",
        }),
        method: "POST",
      },
    );
    const releaseResponse = await app.request(
      "/api/v1/inventory/units/unit_1/reservation/release",
      {
        body: JSON.stringify({ reason: "Cliente desistiu" }),
        method: "POST",
      },
    );

    expect(reserveResponse.status).toBe(201);
    expect(sellResponse.status).toBe(201);
    expect(releaseResponse.status).toBe(200);
    expect(services.reserveUnit).toHaveBeenCalledOnce();
    expect(services.sellUnit).toHaveBeenCalledOnce();
    expect(services.releaseUnitReservation).toHaveBeenCalledOnce();
  });

  it("keeps public storefront lead capture connected to CRM and audit", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const crmRepository = createCrmRepository();
    const app = createStorefrontFeature({
      audit,
      crmRepository,
      repository: createRepository(),
    });

    const response = await app.request("/listings/fiat-toro-2023/leads", {
      body: JSON.stringify({
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
      }),
      headers: {
        "content-type": "application/json",
        host: "demo.lojaveiculos.com.br",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(crmRepository.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "public_site",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public_storefront.lead.create",
        outcome: "succeeded",
      }),
    );
  });
});

function createUserContext(
  permissions: readonly string[],
  audit = { record: vi.fn(async () => undefined) },
  entitlements: readonly string[] = [],
) {
  return {
    ...createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit,
      permissions,
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements,
  };
}
