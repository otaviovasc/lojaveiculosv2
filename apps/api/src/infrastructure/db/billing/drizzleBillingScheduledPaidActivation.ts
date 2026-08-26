import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  payments,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function schedulePaidPlanActivation(
  db: DrizzleBillingClient,
  args: {
    activationAt: Date;
    hire: typeof billingPlanHires.$inferSelect;
    input: UpsertBillingProviderPaymentInput;
    observedAt: Date;
    paymentId: string;
  },
) {
  const { activationAt, hire, input, observedAt, paymentId } = args;
  if (hire.effectiveSubscriptionItemId) return;
  await endActivePlanItems(db, hire.storeId, hire.tenantId, activationAt);
  const [scheduled] = await db
    .insert(subscriptionItems)
    .values({
      itemType: "plan",
      planId: hire.planId,
      quantity: 1,
      startsAt: activationAt,
      storeId: hire.storeId,
      subscriptionId: hire.subscriptionId,
      tenantId: hire.tenantId,
      unitAmountCents: hire.quotedCents,
    })
    .returning({ id: subscriptionItems.id });
  if (!scheduled)
    throw new Error("Scheduled billing contract was not persisted.");
  await db
    .update(billingPlanHires)
    .set({
      effectiveSubscriptionItemId: scheduled.id,
      failureCode: null,
      providerPaymentId: input.providerPaymentId,
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      status: "activation_pending",
      updatedAt: observedAt,
    })
    .where(eq(billingPlanHires.id, hire.id));
  if (hire.status !== "activation_pending") {
    await db.insert(billingPlanHireTransitions).values({
      fromStatus: hire.status,
      hireId: hire.id,
      metadata: { effectiveAt: activationAt.toISOString(), paymentId },
      providerEventId: input.providerEventId,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
      toStatus: "activation_pending",
    });
  }
}

export async function finalizeScheduledPaidPlanActivations(
  db: DrizzleBillingClient,
  now: Date = new Date(),
  hireId?: string,
) {
  const due = await db
    .select({ hire: billingPlanHires, item: subscriptionItems })
    .from(billingPlanHires)
    .innerJoin(
      subscriptionItems,
      eq(subscriptionItems.id, billingPlanHires.effectiveSubscriptionItemId),
    )
    .innerJoin(
      payments,
      and(
        eq(payments.provider, billingPlanHires.provider),
        eq(payments.providerPaymentId, billingPlanHires.providerPaymentId),
      ),
    )
    .where(
      and(
        eq(billingPlanHires.status, "activation_pending"),
        eq(payments.status, "paid"),
        eq(subscriptionItems.itemType, "plan"),
        lte(billingPlanHires.effectiveAt, now),
        ...(hireId ? [eq(billingPlanHires.id, hireId)] : []),
      ),
    )
    .limit(hireId ? 1 : 1_000);
  let finalized = 0;
  for (const candidate of due) {
    await db.transaction(async (tx) => {
      const client = tx as DrizzleBillingClient;
      await client.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${candidate.hire.tenantId}:${candidate.hire.storeId}:plan-activation`}, 31))`,
      );
      const [hire] = await client
        .select()
        .from(billingPlanHires)
        .where(
          and(
            eq(billingPlanHires.id, candidate.hire.id),
            eq(billingPlanHires.status, "activation_pending"),
            lte(billingPlanHires.effectiveAt, now),
          ),
        )
        .limit(1);
      if (!hire || !hire.effectiveAt) return;
      await client
        .update(subscriptions)
        .set({
          currentPeriodEnd: addMonth(hire.effectiveAt),
          currentPeriodStart: hire.effectiveAt,
          status: "active",
          updatedAt: now,
        })
        .where(
          and(
            eq(subscriptions.id, hire.subscriptionId),
            eq(subscriptions.tenantId, hire.tenantId),
          ),
        );
      await client
        .update(billingPlanHires)
        .set({
          activatedAt: now,
          completedAt: now,
          failureCode: null,
          status: "paid_active",
          updatedAt: now,
        })
        .where(eq(billingPlanHires.id, hire.id));
      await client.insert(billingPlanHireTransitions).values({
        fromStatus: "activation_pending",
        hireId: hire.id,
        metadata: { effectiveAt: hire.effectiveAt.toISOString() },
        storeId: hire.storeId,
        tenantId: hire.tenantId,
        toStatus: "paid_active",
      });
      await projectSelectedEntitlements(client, {
        source: "billing_plan_hire",
        storeId: hire.storeId,
        subscriptionId: hire.subscriptionId,
        tenantId: hire.tenantId,
      });
      await recordBillingProductEvent(client, {
        eventName: "contract_activated",
        hireId: hire.id,
        idempotencyKey: `billing-hire:${hire.id}:contract-activated`,
        properties: {
          catalogVersion: hire.catalogVersion,
          planId: hire.planId,
          quotedCents: hire.quotedCents,
        },
        providerPaymentId: hire.providerPaymentId,
        providerSubscriptionId: hire.providerSubscriptionId,
        storeId: hire.storeId,
        tenantId: hire.tenantId,
      });
      finalized += 1;
    });
  }
  return finalized;
}

function addMonth(value: Date) {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

export async function endActivePlanItems(
  db: DrizzleBillingClient,
  storeId: string,
  tenantId: string,
  now: Date,
) {
  const activeItems = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, storeId),
        eq(subscriptionItems.tenantId, tenantId),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  for (const item of activeItems) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: now, updatedAt: now })
      .where(eq(subscriptionItems.id, item.id));
  }
}
