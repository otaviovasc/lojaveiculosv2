import type { AuditEvent } from "@lojaveiculosv2/audit";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { currentBillingCatalog } from "../../../domains/billing/catalog/currentBillingCatalog.js";
import { createMemoryBillingPlanHireRepository } from "../../billing/adapters/memory/billingPlanHireRepository.js";
import { createMemoryBillingProviderRepository } from "../../billing/adapters/memory/billingProviderRepository.js";
import { createMemoryBillingRepository } from "../../billing/adapters/memory/billingRepository.js";
import { createMemoryBillingWebhookRepository } from "../../billing/adapters/memory/billingWebhookRepository.js";
import { createMemoryPaymentProviderGateway } from "../../billing/adapters/memory/paymentProviderGateway.js";
import { createBillingServices } from "../../billing/controllers/billingServices.js";
import { createAgencyFeature } from "./agency.controller.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const storeId = "22222222-2222-4222-8222-222222222222";

describe("agency controller", () => {
  it("lets an agency tenant member read overview without store slug", async () => {
    const audit = createAudit();
    const app = createTestApp(audit);
    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/overview`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      stores: [{ storeName: "Loja principal" }],
      tenant: { tenantId, tenantName: "Agency One" },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "agency.tenant_overview.read" }),
    );
  });

  it("reads provider status with tenant-scoped audit", async () => {
    const audit = createAudit();
    const app = createTestApp(audit);
    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/billing/provider/status`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      configured: true,
      provider: "asaas",
      webhookConfigured: true,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "agency.billing_provider_status.read",
        tenantId,
      }),
    );
  });

  it("creates and polls a store-scoped plan hire", async () => {
    const audit = createAudit();
    const app = createTestApp(audit);
    const createResponse = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/billing/plan-hires`,
      {
        body: JSON.stringify({
          billingTypes: ["PIX"],
          idempotencyKey: "agency-hire-route-1",
          planId: "83262608-0000-4000-8000-000000000003",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(createResponse.status).toBe(201);
    const hire = (await createResponse.json()) as { id: string };
    expect(hire).toMatchObject({
      phase: "payment_pending",
      planSnapshot: { code: "operacao" },
      quotedCents: 39700,
      status: "payment_pending",
      storeId,
      tenantId,
    });

    const pollResponse = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/billing/plan-hires/${hire.id}`,
    );
    expect(pollResponse.status).toBe(200);
    await expect(pollResponse.json()).resolves.toMatchObject({ id: hire.id });
  });

  it("does not expose Escala quote approval to agency accounts", async () => {
    const app = createTestApp(createAudit());

    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/billing/plan-quotes/quote_1/approve`,
      {
        body: JSON.stringify({
          expiresAt: "2026-09-30T00:00:00.000Z",
          quotedCents: 89700,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(404);
  });

  it("denies the platform approval route to a common agency account", async () => {
    const app = createTestApp(createAudit());
    const quote = await requestEscalaQuote(app);

    const response = await approveEscalaQuote(app, quote.id);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTHORIZATION_DENIED",
    });
  });

  it("approves an Escala quote through the platform-admin route", async () => {
    const app = createTestApp(createAudit(), true);
    const quote = await requestEscalaQuote(app);

    const response = await approveEscalaQuote(app, quote.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: quote.id,
      quotedCents: 89700,
      status: "approved",
    });
  });
});

function createTestApp(
  audit: ReturnType<typeof createAudit>,
  platformAdmin = false,
) {
  const app = new Hono();
  app.route(
    "/api/v1/agency",
    createAgencyFeature({
      accountContextFactory: async (_context, scope) => ({
        profile: {
          clerkUserId: "clerk_seed_agency",
          email: "agency.seed@lojaveiculos.com.br",
          emailVerified: true,
          name: "Seed Agency",
        },
        serviceContext: {
          ...createServiceContext({
            actor: {
              externalId: "clerk_seed_agency",
              id: "user_agency",
              kind: "user",
            },
            audit,
            billingManagedBy: "agency",
            permissions: ["billing.manage", "store.manage"],
            request: { requestId: "request_1" },
            tenantId: scope.tenantId,
          }),
          platformAdmin,
        },
      }),
      services: createBillingServices({
        ports: {
          billingPlanHireRepository: createMemoryBillingPlanHireRepository(),
          billingProviderRepository: createMemoryBillingProviderRepository(),
          billingRepository: createMemoryBillingRepository({
            storeId,
            tenantId,
          }),
          billingWebhookRepository: createMemoryBillingWebhookRepository(),
          environment: "test",
          paymentProviderGateway: createMemoryPaymentProviderGateway([]),
          publicAppUrl: "http://localhost:5173",
        },
      }),
    }),
  );
  return app;
}

async function requestEscalaQuote(app: Hono) {
  const escala = currentBillingCatalog.plans.find(
    (plan) => plan.code === "escala",
  );
  if (!escala) throw new Error("Escala test plan is unavailable.");
  const response = await app.request(
    `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/billing/plan-quotes`,
    {
      body: JSON.stringify({ planId: escala.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
}

function approveEscalaQuote(app: Hono, quoteId: string) {
  return app.request(
    `/api/v1/agency/platform/tenants/${tenantId}/stores/${storeId}/billing/plan-quotes/${quoteId}/approve`,
    {
      body: JSON.stringify({
        expiresAt: "2026-09-30T00:00:00.000Z",
        quotedCents: 89700,
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
  );
}

function createAudit() {
  return {
    record: vi.fn(async (_event: AuditEvent) => undefined),
  };
}
