import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import type { BillingProviderSyncError } from "./syncBillingProviderSubscription.js";
import { syncBillingProviderSubscription } from "./syncBillingProviderSubscription.js";
import { createUnusedBillingRepository } from "../../testSupportBillingRepository.js";
import { createProviderRepository } from "./syncBillingProviderSubscription.testSupport.js";

describe("syncBillingProviderSubscription", () => {
  it("creates provider customer and subscription from calculated chargeables", async () => {
    const audit = createAuditSink();
    const providerRepository = createProviderRepository();
    const gateway = createGateway();
    const billingRepository = createUnusedBillingRepository();
    billingRepository.getOverview = vi.fn(
      async () => ({ addons: [] }) as never,
    );

    const result = await syncBillingProviderSubscription(
      createContext(audit),
      {
        billingType: "PIX",
        nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
      },
      {
        billingProviderRepository: providerRepository.repository,
        billingRepository,
        paymentProviderGateway: gateway.gateway,
      },
    );

    expect(gateway.syncCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        existingProviderCustomerId: null,
        externalReference: "lojaveiculos:tenant:tenant_1",
      }),
    );
    expect(gateway.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        billingType: "PIX",
        existingProviderSubscriptionId: null,
        externalReference: "lojaveiculos:subscription:subscription_1",
        nextDueDate: "2026-07-10",
        updatePendingPayments: true,
        valueCents: 54899,
      }),
    );
    expect(providerRepository.savedCustomer?.providerCustomerId).toBe("cus_1");
    expect(providerRepository.savedCustomer).toMatchObject({
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(providerRepository.savedSubscription?.providerSubscriptionId).toBe(
      "sub_1",
    );
    expect(providerRepository.savedSubscription).toMatchObject({
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(
      billingRepository.activateSubscriptionSelection,
    ).toHaveBeenCalledWith({
      source: "billing_selection",
      storeId: "store_1",
      subscriptionId: "subscription_1",
      tenantId: "tenant_1",
    });
    expect(result).toMatchObject({
      chargeTotalCents: 54899,
      providerCustomerId: "cus_1",
      providerSubscriptionId: "sub_1",
      status: "active",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.provider_subscription.sync",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });

  it("blocks provider calls when the calculated charge is empty", async () => {
    const providerRepository = createProviderRepository(0);
    const gateway = createGateway();
    const billingRepository = createUnusedBillingRepository();
    billingRepository.getOverview = vi.fn(
      async () => ({ addons: [] }) as never,
    );

    await expect(
      syncBillingProviderSubscription(
        createContext(createAuditSink()),
        {},
        {
          billingProviderRepository: providerRepository.repository,
          billingRepository,
          paymentProviderGateway: gateway.gateway,
        },
      ),
    ).rejects.toMatchObject({
      name: "BillingProviderSyncError",
      reason: "empty_charge_preview",
    } satisfies Partial<BillingProviderSyncError>);

    expect(gateway.syncCustomer).not.toHaveBeenCalled();
    expect(gateway.syncSubscription).not.toHaveBeenCalled();
  });

  it("stops before subscription creation when provider customer binding conflicts", async () => {
    const providerRepository = createProviderRepository();
    providerRepository.repository.saveProviderCustomer = vi.fn(
      async () => null,
    );
    const gateway = createGateway();

    await expect(
      syncBillingProviderSubscription(
        createContext(createAuditSink()),
        {},
        {
          billingProviderRepository: providerRepository.repository,
          billingRepository: createUnusedBillingRepository(),
          paymentProviderGateway: gateway.gateway,
        },
      ),
    ).rejects.toMatchObject({
      reason: "provider_customer_identity_conflict",
      status: 409,
    });
    expect(gateway.syncSubscription).not.toHaveBeenCalled();
  });

  it("fails closed when confirmed payment changes the contract during provider observation", async () => {
    const providerRepository = createProviderRepository();
    providerRepository.repository.saveProviderSubscription = vi.fn(
      async () => null,
    );
    const gateway = createGateway("OVERDUE");
    const billingRepository = createUnusedBillingRepository();

    await expect(
      syncBillingProviderSubscription(
        createContext(createAuditSink()),
        {},
        {
          billingProviderRepository: providerRepository.repository,
          billingRepository,
          paymentProviderGateway: gateway.gateway,
        },
      ),
    ).rejects.toMatchObject({
      reason: "provider_subscription_state_changed",
      status: 409,
    });
    expect(
      billingRepository.activateSubscriptionSelection,
    ).not.toHaveBeenCalled();
  });

  it("does not project paid entitlements from an OVERDUE provider observation", async () => {
    const providerRepository = createProviderRepository();
    const gateway = createGateway("OVERDUE");
    const billingRepository = createUnusedBillingRepository();

    await expect(
      syncBillingProviderSubscription(
        createContext(createAuditSink()),
        {},
        {
          billingProviderRepository: providerRepository.repository,
          billingRepository,
          paymentProviderGateway: gateway.gateway,
        },
      ),
    ).resolves.toMatchObject({ status: "past_due" });
    expect(
      billingRepository.activateSubscriptionSelection,
    ).not.toHaveBeenCalled();
  });
});

function createContext(audit: AuditSink) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit,
    permissions: ["billing.manage"],
    request: { requestId: "request_1" },
    source: { component: "test", service: "api" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createAuditSink(): AuditSink {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  return { record };
}

function createGateway(status: "ACTIVE" | "OVERDUE" = "ACTIVE") {
  const syncCustomer = vi.fn(async () => ({
    created: true,
    provider: "asaas" as const,
    providerCustomerId: "cus_1",
  }));
  const syncSubscription = vi.fn(async () => ({
    created: true,
    currentPeriodEnd: new Date("2026-08-10T00:00:00.000Z"),
    provider: "asaas" as const,
    providerSubscriptionId: "sub_1",
    status,
  }));
  const gateway: PaymentProviderGateway = {
    async getProviderStatus() {
      return {
        configured: true,
        missingConfiguration: [],
        provider: "asaas",
        webhookConfigured: true,
      };
    },
    syncCustomer,
    syncSubscription,
  };
  return { gateway, syncCustomer, syncSubscription };
}
