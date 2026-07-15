import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import {
  createChargePreview,
  createChargeableItem,
} from "../../readModels/billingChargePreviewModel.js";
import type { BillingProviderSyncError } from "./syncBillingProviderSubscription.js";
import { syncBillingProviderSubscription } from "./syncBillingProviderSubscription.js";
import { createUnusedBillingRepository } from "../../testSupportBillingRepository.js";

describe("syncBillingProviderSubscription", () => {
  it("creates provider customer and subscription from calculated chargeables", async () => {
    const audit = createAuditSink();
    const providerRepository = createProviderRepository();
    const gateway = createGateway();
    const billingRepository = createUnusedBillingRepository();

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
    expect(providerRepository.savedSubscription?.providerSubscriptionId).toBe(
      "sub_1",
    );
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
      name: "BillingProviderSyncError",
      reason: "empty_charge_preview",
    } satisfies Partial<BillingProviderSyncError>);

    expect(gateway.syncCustomer).not.toHaveBeenCalled();
    expect(gateway.syncSubscription).not.toHaveBeenCalled();
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

function createGateway() {
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
    status: "ACTIVE" as const,
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

function createProviderRepository(totalCents = 54899) {
  let savedCustomer:
    Parameters<BillingProviderRepository["saveProviderCustomer"]>[0] | null =
    null;
  let savedSubscription:
    | Parameters<BillingProviderRepository["saveProviderSubscription"]>[0]
    | null = null;
  const repository: BillingProviderRepository = {
    async getProviderAccount() {
      return {
        billingCustomer: {
          documentNumber: "11222333000181",
          email: "billing-test@lojaveiculos.com.br",
          id: "billing_customer_1",
          name: "Loja Teste LTDA",
          provider: "asaas",
          providerCustomerId: "local_asaas_customer_test",
        },
        chargePreview:
          totalCents > 0
            ? createChargePreview({
                chargeables: [
                  createChargeableItem({
                    id: "subscription_item_1",
                    itemType: "plan",
                    label: "Growth",
                    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
                    periodStart: new Date("2026-07-01T00:00:00.000Z"),
                    quantity: 1,
                    startsAt: new Date("2026-07-01T00:00:00.000Z"),
                    storeId: "store_1" as never,
                    storeName: "Loja Teste",
                    unitAmountCents: 29900,
                  }),
                  createChargeableItem({
                    id: "subscription_item_2",
                    itemType: "addon",
                    label: "CRM WhatsApp",
                    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
                    periodStart: new Date("2026-07-01T00:00:00.000Z"),
                    quantity: 1,
                    startsAt: new Date("2026-07-16T00:00:00.000Z"),
                    storeId: "store_1" as never,
                    storeName: "Loja Teste",
                    unitAmountCents: 24999,
                  }),
                ],
              })
            : createChargePreview({ chargeables: [] }),
        subscription: {
          currentPeriodEnd: null,
          currentPeriodStart: null,
          id: "subscription_1",
          provider: "asaas",
          providerSubscriptionId: "local_asaas_subscription_test",
          status: "trialing",
        },
      };
    },
    async saveProviderCustomer(input) {
      savedCustomer = input;
      return {
        documentNumber: "11222333000181",
        email: "billing-test@lojaveiculos.com.br",
        id: input.billingCustomerId,
        name: "Loja Teste LTDA",
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
      };
    },
    async saveProviderCheckout() {
      throw new Error("Unused provider checkout.");
    },
    async saveProviderSubscription(input) {
      savedSubscription = input;
      return {
        currentPeriodEnd: input.currentPeriodEnd,
        currentPeriodStart: input.currentPeriodStart,
        id: input.subscriptionId,
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
      };
    },
  };
  return {
    repository,
    get savedCustomer() {
      return savedCustomer;
    },
    get savedSubscription() {
      return savedSubscription;
    },
  };
}
