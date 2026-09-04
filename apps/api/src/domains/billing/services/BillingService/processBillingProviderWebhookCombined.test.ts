import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import {
  createAuditSink,
  createBillingRepository,
  createProviderGateway,
  createWebhookContext,
  createWebhookRepository,
} from "../../testSupportProcessBillingProviderWebhook.js";
import { processBillingProviderWebhook } from "./processBillingProviderWebhook.js";

describe("processBillingProviderWebhook combined evidence", () => {
  it("processes authoritative payment evidence when checkout and payment share one payload", async () => {
    const repository = createWebhookRepository();
    const observations: string[] = [];
    const capturingRepository = {
      ...repository,
      async syncProviderCheckout(
        input: Parameters<typeof repository.syncProviderCheckout>[0],
      ) {
        observations.push(`checkout:${input.providerCheckoutId}`);
        return repository.syncProviderCheckout(input);
      },
      async upsertProviderPayment(
        input: Parameters<typeof repository.upsertProviderPayment>[0],
      ) {
        observations.push(`payment:${input.status}`);
        return repository.upsertProviderPayment(input);
      },
    };

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(createAuditSink()),
        {
          payload: {
            checkout: {
              customer: "cus_1",
              id: "chk_memory",
              status: "PAID",
            },
            event: "PAYMENT_CONFIRMED",
            id: "evt_combined_confirmed_1",
            payment: {
              checkoutSession: "chk_memory",
              confirmedDate: "2026-08-25",
              customer: "cus_1",
              dueDate: "2026-08-25",
              id: "pay_combined_1",
              subscription: "sub_memory",
              value: 197,
            },
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        {
          billingRepository: createBillingRepository(),
          billingWebhookRepository: capturingRepository,
          environment: "test",
          paymentProviderGateway: createProviderGateway("secret"),
        },
      ),
    ).resolves.toMatchObject({ status: "processed" });
    expect(observations).toEqual(["checkout:chk_memory", "payment:paid"]);
  });

  it("processes confirmed payment when checkout state is terminal and records the divergence", async () => {
    const repository = createWebhookRepository();
    const auditEvents: AuditEvent[] = [];
    const audit = {
      record: vi.fn(async (event: AuditEvent) => {
        auditEvents.push(event);
      }),
    };
    const syncProviderCheckout = vi.fn(async () => ({
      reason: "non_monotonic_checkout_event",
      status: "pending_reconciliation" as const,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    }));

    await expect(
      processBillingProviderWebhook(
        createWebhookContext(audit),
        {
          payload: {
            checkout: { id: "chk_terminal", status: "CANCELED" },
            event: "PAYMENT_CONFIRMED",
            id: "evt_terminal_checkout_paid",
            payment: {
              confirmedDate: "2026-08-25",
              id: "pay_terminal_checkout",
              subscription: "sub_memory",
              value: 197,
            },
          },
          provider: "asaas",
          webhookToken: "secret",
        },
        {
          billingRepository: createBillingRepository(),
          billingWebhookRepository: { ...repository, syncProviderCheckout },
          environment: "test",
          paymentProviderGateway: createProviderGateway("secret"),
        },
      ),
    ).resolves.toMatchObject({ status: "processed" });
    expect(syncProviderCheckout).toHaveBeenCalledTimes(2);
    expect(
      auditEvents.some(
        (event) =>
          event.action === "billing.webhook.asaas.processed" &&
          event.metadata?.reason ===
            "checkout_diverged_from_authoritative_payment",
      ),
    ).toBe(true);
  });
});
