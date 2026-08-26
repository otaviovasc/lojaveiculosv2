import type { AuditSink } from "@lojaveiculosv2/audit";
import { vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type {
  BillingPlanHireRecord,
  BillingPlanHireRepository,
} from "../../ports/billingPlanHireRepository.js";

export function readyProvider() {
  return {
    configured: true,
    missingConfiguration: [],
    provider: "asaas" as const,
    webhookConfigured: true,
  };
}

export function createRepository(
  hire: BillingPlanHireRecord,
  order: string[],
  created = true,
): BillingPlanHireRepository {
  return {
    async approveQuote() {
      throw new Error("not used");
    },
    async bindCheckout(input) {
      order.push("bind");
      return {
        ...hire,
        checkoutUrl: input.checkoutUrl,
        phase: "checkout_created",
        providerCheckoutId: input.providerCheckoutId,
        status: "checkout_created",
      };
    },
    async bindRenewal() {
      return hire;
    },
    async failHire() {},
    async findHire() {
      return hire;
    },
    async prepareHire() {
      order.push("persist");
      return {
        billingTypes: ["CREDIT_CARD"],
        created,
        customerData: null,
        hire,
        providerTransition: null,
      };
    },
    async requestQuote() {
      throw new Error("not used");
    },
    async scheduleFreeDowngrade() {
      return hire;
    },
  };
}

export function createHire(): BillingPlanHireRecord {
  const now = new Date("2026-08-25T12:00:00.000Z");
  return {
    activatedAt: null,
    catalogVersion: "2026-08-v3",
    checkoutMode: "checkout",
    checkoutUrl: null,
    completedAt: null,
    createdAt: now,
    effectiveAt: null,
    failureCode: null,
    id: "83262608-0000-4000-8000-000000000099",
    idempotencyKey: "hire-attempt-0001",
    phase: "payment_pending",
    planId: "83262608-0000-4000-8000-000000000002",
    planSnapshot: { code: "essencial", name: "Essencial", selectionRank: 2 },
    providerCheckoutId: null,
    providerPaymentId: null,
    providerSubscriptionId: null,
    quotedCents: 19_700,
    status: "created",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    updatedAt: now,
  };
}

export function context() {
  const audit: AuditSink = { record: vi.fn(async () => undefined) };
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
