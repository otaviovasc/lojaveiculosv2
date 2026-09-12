import { describe, expect, it } from "vitest";
import {
  deterministicBillingAuditId,
  sanitizeBillingAuditMetadata,
} from "./drizzleBillingAuditOutboxMutation.js";
import { paidActivationAuditRecord } from "./drizzleBillingPaidActivationAudit.js";

describe("paid billing activation audit", () => {
  it("creates one deterministic sanitized activation event", () => {
    const event = paidActivationAuditRecord({
      actorId: "asaas_billing_webhook",
      actorKind: "integration",
      catalogVersion: "2026-08-v3",
      hireId: "00000000-0000-4000-8000-000000000001",
      occurredAt: new Date("2026-08-26T12:00:00.000Z"),
      paymentId: "00000000-0000-4000-8000-000000000002",
      planId: "00000000-0000-4000-8000-000000000003",
      providerCheckoutId: "chk_1",
      providerEventId: "evt_1",
      providerPaymentId: "pay_1",
      providerSubscriptionId: "sub_1",
      quotedCents: 19_700,
      requestId: "request_1",
      storeId: "00000000-0000-4000-8000-000000000004",
      tenantId: "00000000-0000-4000-8000-000000000005",
    });
    expect(event).toMatchObject({
      action: "billing.plan_hire.activated",
      idempotencyKey:
        "billing-audit:hire:00000000-0000-4000-8000-000000000001:activated",
      metadata: {
        paymentId: "00000000-0000-4000-8000-000000000002",
        providerEventId: "evt_1",
        providerPaymentId: "pay_1",
        providerSubscriptionId: "sub_1",
        status: "paid_active",
      },
    });
    expect(JSON.stringify(event)).not.toContain("raw");
    expect(() => sanitizeBillingAuditMetadata(event.metadata)).not.toThrow();
    expect(deterministicBillingAuditId(event.idempotencyKey)).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });
});
