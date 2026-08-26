import { and, eq, inArray, isNull, or, gt, lte } from "drizzle-orm";
import {
  planFeatures,
  storeEntitlementEvents,
  storeEntitlements,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function projectSelectedEntitlements(
  db: DrizzleBillingClient,
  input: {
    source: "billing_checkout" | "billing_plan_hire" | "billing_selection";
    storeId: string;
    subscriptionId: string;
    tenantId: string;
  },
) {
  const now = new Date();
  const [subscription] = await db
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
  const subscriptionGrantsAccess =
    subscription?.status === "active" ||
    (subscription?.status === "past_due" &&
      Boolean(
        subscription.currentPeriodEnd && subscription.currentPeriodEnd > now,
      ));
  const items = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.storeId, input.storeId),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    );
  const planIds = items.flatMap((item) => (item.planId ? [item.planId] : []));
  const [features, current] = await Promise.all([
    planIds.length
      ? db
          .select()
          .from(planFeatures)
          .where(inArray(planFeatures.planId, planIds))
      : [],
    db
      .select()
      .from(storeEntitlements)
      .where(
        and(
          eq(storeEntitlements.storeId, input.storeId),
          eq(storeEntitlements.tenantId, input.tenantId),
        ),
      ),
  ]);
  const selected = new Set(
    subscriptionGrantsAccess
      ? [
          ...features
            .filter((feature) => feature.included === 1)
            .map((feature) => feature.featureKey),
        ]
      : [],
  );

  for (const entitlement of current) {
    if (selected.has(entitlement.featureKey)) continue;
    if (entitlement.status === "inactive") continue;
    if (entitlement.source !== "billing_catalog") continue;
    await writeEntitlement(db, input, entitlement.featureKey, "inactive", now);
  }
  for (const featureKey of selected) {
    const entitlement = current.find((item) => item.featureKey === featureKey);
    if (entitlement && shouldPreserveExternalEntitlement(entitlement, now))
      continue;
    if (entitlement?.status === "active" && !entitlement.endsAt) continue;
    await writeEntitlement(db, input, featureKey, "active", now);
  }
}

export function shouldPreserveExternalEntitlement(
  entitlement: Pick<typeof storeEntitlements.$inferSelect, "endsAt" | "source">,
  now: Date,
) {
  return (
    entitlement.source !== "billing_catalog" &&
    (!entitlement.endsAt || entitlement.endsAt > now)
  );
}

async function writeEntitlement(
  db: DrizzleBillingClient,
  input: Parameters<typeof projectSelectedEntitlements>[1],
  featureKey: string,
  status: "active" | "inactive",
  now: Date,
) {
  const [before] = await db
    .select()
    .from(storeEntitlements)
    .where(
      and(
        eq(storeEntitlements.storeId, input.storeId),
        eq(storeEntitlements.featureKey, featureKey),
      ),
    )
    .limit(1);
  await db
    .insert(storeEntitlements)
    .values({
      endsAt: status === "inactive" ? now : null,
      featureKey,
      metadata: { sourceDetail: input.source },
      source: "billing_catalog",
      startsAt: status === "active" ? now : (before?.startsAt ?? null),
      status,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        endsAt: status === "inactive" ? now : null,
        metadata: { sourceDetail: input.source },
        source: "billing_catalog",
        startsAt: status === "active" ? now : (before?.startsAt ?? null),
        status,
        updatedAt: now,
      },
      target: [storeEntitlements.storeId, storeEntitlements.featureKey],
    });
  await db.insert(storeEntitlementEvents).values({
    featureKey,
    metadata: { sourceDetail: input.source },
    nextStatus: status,
    previousStatus: before?.status ?? null,
    reason:
      status === "active"
        ? "Selected subscription activated."
        : "Removed from selected subscription.",
    source: input.source,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}
