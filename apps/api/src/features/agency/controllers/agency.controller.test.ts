import type { AuditEvent } from "@lojaveiculosv2/audit";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
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
      phase: "checkout_created",
      planSnapshot: { code: "operacao" },
      quotedCents: 39700,
      status: "checkout_created",
      storeId,
      tenantId,
    });

    const pollResponse = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/billing/plan-hires/${hire.id}`,
    );
    expect(pollResponse.status).toBe(200);
    await expect(pollResponse.json()).resolves.toMatchObject({ id: hire.id });
  });
});

function createTestApp(audit: ReturnType<typeof createAudit>) {
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
        serviceContext: createServiceContext({
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

function createAudit() {
  return {
    record: vi.fn(async (_event: AuditEvent) => undefined),
  };
}
