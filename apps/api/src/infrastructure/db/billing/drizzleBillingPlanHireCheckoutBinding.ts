import { and, eq, inArray, isNull } from "drizzle-orm";
import { billingCheckoutSessions, billingPlanHires } from "@lojaveiculosv2/db";
import type {
  BillingPlanHireRepository,
  BillingPlanHireStatus,
} from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { enqueueBillingAudit } from "./drizzleBillingAuditOutboxMutation.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  recordPlanHireTransition,
  scopedPlanHire,
  toPlanHire,
} from "./drizzleBillingPlanHireSupport.js";

type BindCheckoutInput = Parameters<
  BillingPlanHireRepository["bindCheckout"]
>[0];

export async function bindPlanHireCheckout(
  db: DrizzleBillingClient,
  input: BindCheckoutInput,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    const [before] = await txDb
      .select()
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!before) throw new Error("Billing plan hire was not found.");
    if (before.providerCheckoutId === input.providerCheckoutId) {
      const [existing] = await txDb
        .select({ checkoutUrl: billingCheckoutSessions.checkoutUrl })
        .from(billingCheckoutSessions)
        .where(
          and(
            eq(billingCheckoutSessions.planHireId, before.id),
            eq(
              billingCheckoutSessions.providerCheckoutId,
              input.providerCheckoutId,
            ),
            eq(billingCheckoutSessions.storeId, before.storeId),
            eq(billingCheckoutSessions.tenantId, before.tenantId),
          ),
        )
        .limit(1);
      if (!existing)
        throw new Error("Billing checkout binding is inconsistent.");
      return toPlanHire(before, existing.checkoutUrl);
    }
    if (!checkoutIdentityCanBind(before.providerCheckoutId)) {
      throw new Error("Billing checkout identity conflicts with this hire.");
    }
    const nextStatus = statusAfterCheckoutBinding(before.status);
    const [hire] = await txDb
      .update(billingPlanHires)
      .set({
        providerCheckoutId: input.providerCheckoutId,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          scopedPlanHire(input),
          isNull(billingPlanHires.providerCheckoutId),
          inArray(billingPlanHires.status, [
            "created",
            "checkout_created",
            "payment_pending",
          ]),
        ),
      )
      .returning();
    if (!hire)
      throw new Error("Billing plan hire changed during checkout binding.");
    await txDb.insert(billingCheckoutSessions).values({
      callbackUrls: input.callbackUrls,
      checkoutUrl: input.checkoutUrl,
      expiresAt: input.expiresAt,
      externalReference: hire.id,
      planHireId: hire.id,
      provider: "asaas",
      providerCheckoutId: input.providerCheckoutId,
      raw: input.raw,
      status: "created",
      storeId: hire.storeId,
      subscriptionId: hire.subscriptionId,
      tenantId: hire.tenantId,
    });
    if (before.status !== nextStatus) {
      await recordPlanHireTransition(txDb, hire, before.status, nextStatus);
    }
    await recordCheckoutObservability(txDb, hire, input);
    return toPlanHire(hire, input.checkoutUrl);
  });
}

async function recordCheckoutObservability(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: BindCheckoutInput,
) {
  await recordBillingProductEvent(db, {
    eventName: "checkout_created",
    hireId: hire.id,
    idempotencyKey: `billing-checkout:${input.providerCheckoutId}:created`,
    providerCheckoutId: input.providerCheckoutId,
    requestId: input.requestId ?? null,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
  await recordBillingProductEvent(db, {
    eventName: "provider_bound",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:checkout-bound`,
    providerCheckoutId: input.providerCheckoutId,
    requestId: input.requestId ?? null,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
  await enqueueBillingAudit(db, {
    action: "billing.plan_hire.checkout_created",
    audit: input.audit,
    entityId: hire.id,
    entityType: "billing_plan_hire",
    idempotencyKey: `billing-audit:checkout:${input.providerCheckoutId}:created`,
    metadata: {
      catalogVersion: hire.catalogVersion,
      planId: hire.planId,
      providerCheckoutId: input.providerCheckoutId,
      quotedCents: hire.quotedCents,
      status: hire.status,
    },
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
}

export function checkoutIdentityCanBind(providerCheckoutId: string | null) {
  return providerCheckoutId === null;
}

export function statusAfterCheckoutBinding(
  status: BillingPlanHireStatus,
): BillingPlanHireStatus {
  return status === "created" ? "checkout_created" : status;
}
