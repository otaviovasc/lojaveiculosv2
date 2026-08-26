import { and, eq, sql } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

export async function enterPastDueGrace(
  db: DrizzleBillingClient,
  input: {
    currentPeriodStart?: Date | null;
    providerEventId?: string | null;
    providerLifecycleObservedAt?: Date | null;
    storeId: string | null;
    subscriptionId: string;
    tenantId: string;
  },
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.subscriptionId}:past-due-grace`}, 31))`,
  );
  const now = new Date();
  const [current] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!current) return;
  const graceEndsAt = graceDeadline(current, now);
  await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: graceEndsAt,
      ...(input.currentPeriodStart
        ? { currentPeriodStart: input.currentPeriodStart }
        : {}),
      ...(input.providerLifecycleObservedAt
        ? {
            providerLifecycleEventId: input.providerEventId ?? null,
            providerLifecycleObservedAt: input.providerLifecycleObservedAt,
          }
        : {}),
      status: "past_due",
      updatedAt: now,
    })
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    );
  if (input.storeId) {
    await projectSelectedEntitlements(db, {
      source: "billing_plan_hire",
      storeId: input.storeId,
      subscriptionId: input.subscriptionId,
      tenantId: input.tenantId,
    });
  }
  await recordBillingProductEvent(db, {
    eventName: "grace_entered",
    idempotencyKey: `billing-grace:${input.subscriptionId}:${graceEndsAt.toISOString()}`,
    properties: { status: "past_due" },
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

export function graceDeadline(
  current: {
    currentPeriodEnd: Date | null;
    status: (typeof subscriptions.$inferSelect)["status"];
  },
  now: Date,
) {
  return current.status === "past_due" && current.currentPeriodEnd
    ? current.currentPeriodEnd
    : addDays(now, 7);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
