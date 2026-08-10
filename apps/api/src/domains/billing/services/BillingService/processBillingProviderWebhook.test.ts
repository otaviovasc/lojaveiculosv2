import { describe, expect, it } from "vitest";
import { processBillingProviderWebhook } from "./processBillingProviderWebhook.js";
import { BillingWebhookAuthenticationError } from "../../readModels/billingWebhookErrors.js";
import {
  createAuditSink,
  createBillingRepository,
  createProviderGateway,
  createWebhookContext,
  createWebhookRepository,
} from "../../testSupportProcessBillingProviderWebhook.js";

describe("processBillingProviderWebhook", () => {
  it("syncs a received Asaas payment and records duplicate events once", async () => {
    const audit = createAuditSink();
    const context = createWebhookContext(audit);
    const ports = {
      billingRepository: createBillingRepository(),
      billingWebhookRepository: createWebhookRepository(),
      environment: "test",
      paymentProviderGateway: createProviderGateway("secret"),
    };
    const payload = {
      event: "PAYMENT_RECEIVED",
      id: "evt_payment_received_1",
      payment: {
        customer: "cus_1",
        dueDate: "2026-07-31",
        externalReference: "lojaveiculos:tenant_1:2026-07",
        id: "pay_1",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
        paymentDate: "2026-07-06",
        subscription: "sub_memory",
        value: 548.99,
      },
    };

    await expect(
      processBillingProviderWebhook(
        context,
        { payload, provider: "asaas", webhookToken: "secret" },
        ports,
      ),
    ).resolves.toMatchObject({
      providerEventId: "evt_payment_received_1",
      status: "processed",
    });
    await expect(
      processBillingProviderWebhook(
        context,
        { payload, provider: "asaas", webhookToken: "secret" },
        ports,
      ),
    ).resolves.toMatchObject({ status: "duplicate" });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.webhook.asaas.processed",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });

  it("rejects invalid webhook tokens before recording events", async () => {
    const ports = {
      billingRepository: createBillingRepository(),
      billingWebhookRepository: createWebhookRepository(),
      environment: "test",
      paymentProviderGateway: createProviderGateway("secret"),
    };

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: { event: "PAYMENT_RECEIVED", id: "evt_invalid" },
          provider: "asaas",
          webhookToken: "wrong",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(BillingWebhookAuthenticationError);
  });

  it("reclaims an event left received by a crashed delivery", async () => {
    const repository = createWebhookRepository();
    const payload = {
      event: "PAYMENT_RECEIVED",
      id: "evt_crash_recovery",
      payment: {
        customer: "cus_1",
        dueDate: "2026-08-10",
        id: "pay_crash_recovery",
        subscription: "sub_memory",
        value: 548.99,
      },
    };
    await repository.recordReceived({
      environment: "test",
      eventType: "PAYMENT_RECEIVED",
      payload,
      provider: "asaas",
      providerEventId: "evt_crash_recovery",
    });

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        { payload, provider: "asaas", webhookToken: "secret" },
        {
          billingRepository: createBillingRepository(),
          billingWebhookRepository: repository,
          environment: "test",
          paymentProviderGateway: createProviderGateway("secret"),
        },
      ),
    ).resolves.toMatchObject({ status: "processed" });
  });

  it("syncs a received Asaas checkout payment event", async () => {
    const audit = createAuditSink();
    const context = createWebhookContext(audit);
    const ports = {
      billingRepository: createBillingRepository(),
      billingWebhookRepository: createWebhookRepository(),
      environment: "test",
      paymentProviderGateway: createProviderGateway("secret"),
    };

    await expect(
      processBillingProviderWebhook(
        context,
        {
          payload: {
            checkout: {
              customer: "cus_1",
              id: "chk_memory",
              status: "PAID",
              subscription: {
                id: "sub_asaas_1",
                nextDueDate: "2026-08-08",
              },
            },
            event: "CHECKOUT_PAID",
            id: "evt_checkout_paid_1",
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        ports,
      ),
    ).resolves.toMatchObject({
      providerEventId: "evt_checkout_paid_1",
      status: "processed",
    });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.webhook.asaas.processed",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });
});
