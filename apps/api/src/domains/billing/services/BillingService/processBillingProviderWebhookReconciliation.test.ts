import { describe, expect, it } from "vitest";
import {
  createAuditSink,
  createBillingRepository,
  createProviderGateway,
  createWebhookContext,
  createWebhookRepository,
} from "../../testSupportProcessBillingProviderWebhook.js";
import { processBillingProviderWebhook } from "./processBillingProviderWebhook.js";

describe("processBillingProviderWebhook reconciliation", () => {
  it("repairs unmatched payment evidence before processing the event", async () => {
    const repository = createWebhookRepository();
    const upserts: Array<{
      externalReference: string | null;
      providerCheckoutId: string | null | undefined;
      providerEvidenceVerified: boolean | undefined;
      providerEventOccurredAt: Date | null | undefined;
    }> = [];
    const repairingRepository = {
      ...repository,
      async upsertProviderPayment(
        input: Parameters<typeof repository.upsertProviderPayment>[0],
      ) {
        upserts.push({
          externalReference: input.externalReference,
          providerCheckoutId: input.providerCheckoutId,
          providerEvidenceVerified: input.providerEvidenceVerified,
          providerEventOccurredAt: input.providerEventOccurredAt,
        });
        return upserts.length === 1
          ? pendingReconciliation()
          : {
              status: "synced" as const,
              storeId: "store_1" as never,
              tenantId: "tenant_1" as never,
            };
      },
    };

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: {
            dateCreated: "2026-08-26T12:34:56.000Z",
            event: "PAYMENT_CONFIRMED",
            id: "evt_repaired",
            payment: {
              confirmedDate: "2026-08-26",
              id: "pay_repaired",
              value: 197,
            },
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        {
          billingRepository: createBillingRepository(),
          billingWebhookRepository: repairingRepository,
          environment: "test",
          paymentProviderGateway: {
            ...createProviderGateway("secret"),
            async lookupPaymentCorrelation() {
              return {
                externalReference: "hire_repaired",
                providerCheckoutId: "chk_repaired",
                providerCustomerId: "cus_repaired",
                providerPaymentId: "pay_repaired",
                providerSubscriptionId: "sub_repaired",
              };
            },
          },
        },
      ),
    ).resolves.toMatchObject({ status: "processed" });
    expect(upserts).toEqual([
      {
        externalReference: null,
        providerCheckoutId: null,
        providerEvidenceVerified: undefined,
        providerEventOccurredAt: new Date("2026-08-26T12:34:56.000Z"),
      },
      {
        externalReference: "hire_repaired",
        providerCheckoutId: "chk_repaired",
        providerEvidenceVerified: true,
        providerEventOccurredAt: new Date("2026-08-26T12:34:56.000Z"),
      },
    ]);
  });

  it("rejects a bounded lookup that returns a different payment identity", async () => {
    const repository = createWebhookRepository();
    let paymentUpserts = 0;
    const pendingRepository = {
      ...repository,
      async upsertProviderPayment() {
        paymentUpserts += 1;
        return pendingReconciliation();
      },
    };

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: {
            event: "PAYMENT_CONFIRMED",
            id: "evt_identity_mismatch",
            payment: { id: "pay_expected", value: 197 },
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        {
          billingRepository: createBillingRepository(),
          billingWebhookRepository: pendingRepository,
          environment: "test",
          paymentProviderGateway: {
            ...createProviderGateway("secret"),
            async lookupPaymentCorrelation() {
              return {
                externalReference: "hire_wrong",
                providerCheckoutId: "chk_wrong",
                providerCustomerId: "cus_wrong",
                providerPaymentId: "pay_different",
                providerSubscriptionId: "sub_wrong",
              };
            },
          },
        },
      ),
    ).resolves.toMatchObject({ status: "pending_reconciliation" });
    expect(paymentUpserts).toBe(1);
  });

  it("keeps ambiguous payment evidence pending without a second activation attempt", async () => {
    const repository = createWebhookRepository();
    let paymentUpserts = 0;
    const pendingRepository = {
      ...repository,
      async upsertProviderPayment() {
        paymentUpserts += 1;
        return pendingReconciliation();
      },
    };

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: {
            event: "PAYMENT_CONFIRMED",
            id: "evt_ambiguous",
            payment: { id: "pay_ambiguous", value: 197 },
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        {
          billingRepository: createBillingRepository(),
          billingWebhookRepository: pendingRepository,
          environment: "test",
          paymentProviderGateway: {
            ...createProviderGateway("secret"),
            async lookupPaymentCorrelation() {
              return null;
            },
          },
        },
      ),
    ).resolves.toMatchObject({ status: "pending_reconciliation" });
    expect(paymentUpserts).toBe(1);
  });

  it("keeps billing events with missing provider evidence pending", async () => {
    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: {
            event: "PAYMENT_CONFIRMED",
            id: "evt_payment_missing_shape",
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        defaultPorts(),
      ),
    ).resolves.toMatchObject({ status: "pending_reconciliation" });
  });

  it("ignores events explicitly outside the billing domain", async () => {
    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: { event: "CUSTOMER_CREATED", id: "evt_customer_created" },
          provider: "asaas",
          webhookToken: "secret",
        },
        defaultPorts(),
      ),
    ).resolves.toMatchObject({ status: "ignored" });
  });
});

function defaultPorts() {
  return {
    billingRepository: createBillingRepository(),
    billingWebhookRepository: createWebhookRepository(),
    environment: "test",
    paymentProviderGateway: createProviderGateway("secret"),
  };
}

function pendingReconciliation() {
  return {
    reason: "unknown_billing_account",
    status: "pending_reconciliation" as const,
    storeId: null,
    tenantId: null,
  };
}
