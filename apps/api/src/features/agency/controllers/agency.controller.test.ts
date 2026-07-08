import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "@lojaveiculosv2/audit";
import type { AgencyTenantOverview } from "../../../domains/billing/ports/billingRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createBillingServices } from "../../billing/controllers/billingServices.js";
import { createMemoryBillingProviderRepository } from "../../billing/adapters/memory/billingProviderRepository.js";
import { createMemoryBillingRepository } from "../../billing/adapters/memory/billingRepository.js";
import { createMemoryBillingWebhookRepository } from "../../billing/adapters/memory/billingWebhookRepository.js";
import { createMemoryPaymentProviderGateway } from "../../billing/adapters/memory/paymentProviderGateway.js";
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
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "agency.tenant_billing.read" }),
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
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "agency.billing_provider_status.read",
        tenantId,
      }),
    );
  });

  it("syncs the agency tenant subscription from persisted charge preview", async () => {
    const audit = createAudit();
    const app = createTestApp(audit);
    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/billing/provider/subscription/sync`,
      {
        body: JSON.stringify({ billingType: "PIX" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      chargeTotalCents: 29900,
      provider: "asaas",
      status: "active",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.provider_subscription.sync",
        criticality: "critical",
        storeId: null,
        tenantId,
      }),
    );
  });

  it("creates hosted checkouts for agency tenant billing", async () => {
    const audit = createAudit();
    const app = createTestApp(audit);
    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/billing/provider/checkout`,
      {
        body: JSON.stringify({ billingTypes: ["CREDIT_CARD"] }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      checkoutUrl:
        "https://sandbox.asaas.com/checkoutSession/show?id=chk_memory_asaas",
      providerCheckoutId: "chk_memory_asaas",
      subscriptionId: "subscription_memory",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.provider_checkout.create",
        criticality: "critical",
        storeId: null,
        tenantId,
      }),
    );
  });

  it("updates a managed store entitlement with critical agency audit", async () => {
    const audit = createAudit();
    const app = createTestApp(audit);
    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stores/${storeId}/entitlements/crm`,
      {
        body: JSON.stringify({
          featureKey: "crm",
          reason: "Agency billing test",
          status: "suspended",
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    const bodyJson: unknown = await response.json();
    const body = bodyJson as AgencyTenantOverview;
    const [firstStore] = body.stores;
    expect(firstStore).toBeDefined();
    expect(firstStore?.entitlementMatrix).toContainEqual(
      expect.objectContaining({
        featureKey: "crm",
        status: "suspended",
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "agency.store_entitlement.update",
        criticality: "critical",
        storeId,
        tenantId,
      }),
    );
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
          billingProviderRepository: createMemoryBillingProviderRepository(),
          billingRepository: createMemoryBillingRepository(),
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
