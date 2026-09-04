import { and, eq, isNull, lte, or } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import {
  currentPlanItemGrantsPaidAccess,
  findCurrentEffectivePlanItem,
} from "./drizzleBillingEffectivePlanItem.js";

export { currentPlanItemGrantsPaidAccess } from "./drizzleBillingEffectivePlanItem.js";

export async function enterPastDueGrace(
  db: DrizzleBillingClient,
  input: {
    currentPeriodStart?: Date | null;
    expectedProvider?: string;
    expectedProviderSubscriptionId?: string | null;
    providerEventId?: string | null;
    providerLifecycleObservedAt?: Date | null;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
  },
) {
  await lockEffectivePlanContract(db, input.tenantId, input.storeId);
  const now = new Date();
  const [current] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      currentPeriodStart: subscriptions.currentPeriodStart,
      provider: subscriptions.provider,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      providerLifecycleObservedAt: subscriptions.providerLifecycleObservedAt,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.storeId, input.storeId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!current || !subscriptionCanEnterGrace(current, input)) return false;
  const effectivePaid = await findCurrentEffectivePlanItem(db, {
    now,
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
  });
  if (!currentPlanItemGrantsPaidAccess(effectivePaid)) return false;
  const graceEndsAt = graceDeadline(current, now);
  const [transitioned] = await db
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
        eq(subscriptions.storeId, input.storeId),
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.provider, current.provider),
        eq(
          subscriptions.providerSubscriptionId,
          current.providerSubscriptionId!,
        ),
        eq(subscriptions.status, current.status),
        eq(subscriptions.currentPeriodStart, current.currentPeriodStart!),
        eq(subscriptions.currentPeriodEnd, current.currentPeriodEnd!),
        current.providerLifecycleObservedAt
          ? eq(
              subscriptions.providerLifecycleObservedAt,
              current.providerLifecycleObservedAt,
            )
          : isNull(subscriptions.providerLifecycleObservedAt),
      ),
    )
    .returning({ id: subscriptions.id });
  if (!transitioned) return false;
  await projectSelectedEntitlements(db, {
    source: "billing_plan_hire",
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
  });
  await recordBillingProductEvent(db, {
    eventName: "grace_entered",
    idempotencyKey: `billing-grace:${input.subscriptionId}:${graceEndsAt.toISOString()}`,
    properties: { status: "past_due" },
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  return true;
}

export function subscriptionCanEnterGrace(
  current: {
    currentPeriodEnd: Date | null;
    currentPeriodStart: Date | null;
    provider: string;
    providerSubscriptionId: string | null;
    providerLifecycleObservedAt: Date | null;
    status: (typeof subscriptions.$inferSelect)["status"];
  },
  expected: {
    expectedProvider?: string;
    expectedProviderSubscriptionId?: string | null;
    providerLifecycleObservedAt?: Date | null;
  },
) {
  return Boolean(
    (current.status === "active" || current.status === "past_due") &&
    current.currentPeriodStart &&
    current.currentPeriodEnd &&
    current.providerSubscriptionId &&
    (!expected.expectedProvider ||
      expected.expectedProvider === current.provider) &&
    (expected.expectedProviderSubscriptionId === undefined ||
      expected.expectedProviderSubscriptionId ===
        current.providerSubscriptionId) &&
    providerObservationCanApply(
      current.providerLifecycleObservedAt,
      expected.providerLifecycleObservedAt,
    ),
  );
}

export function providerObservationCanApply(
  current: Date | null,
  incoming: Date | null | undefined,
) {
  if (incoming === undefined) return true;
  if (incoming === null) return !current;
  return !current || incoming >= current;
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
