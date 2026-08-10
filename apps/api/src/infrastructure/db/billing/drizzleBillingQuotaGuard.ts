import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  addons,
  planFeatures,
  plans,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import {
  BillingContractUnavailableError,
  BillingQuotaExceededError,
  type BillingQuotaGuard,
  type BillingQuotaKey,
} from "../../../domains/billing/ports/billingQuotaGuard.js";
import { countBillingQuotaUsage } from "./drizzleBillingQuotaUsage.js";

export type DrizzleBillingQuotaClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleBillingQuotaGuard(
  db: DrizzleBillingQuotaClient,
  now: () => Date = () => new Date(),
): BillingQuotaGuard {
  async function getAllowance(input: {
    quotaKey: BillingQuotaKey;
    storeId: string;
    tenantId: string;
  }) {
    const checkedAt = now();
    const contract = await findEffectiveContract(db, input, checkedAt);
    const limit = await resolveLimit(db, contract, input, checkedAt);
    const used = await countBillingQuotaUsage(db, input, contract.periodStart);
    const effectiveLimit = limit ?? Number.MAX_SAFE_INTEGER;
    return {
      limit: effectiveLimit,
      remaining: Math.max(0, effectiveLimit - used),
      used,
    };
  }
  return {
    async assertAvailable(input) {
      const checkedAt = now();
      await db.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${input.storeId}:${input.quotaKey}`}, 29))`,
      );
      const contract = await findEffectiveContract(db, input, checkedAt);
      const limit = await resolveLimit(db, contract, input, checkedAt);
      if (limit === null) return;
      const current = await countBillingQuotaUsage(
        db,
        input,
        contract.periodStart,
      );
      if (current + (input.increment ?? 1) <= limit) return;
      throw new BillingQuotaExceededError({
        current,
        limit,
        quotaKey: input.quotaKey,
      });
    },
    getAllowance,
  };
}

async function findEffectiveContract(
  db: DrizzleBillingQuotaClient,
  input: { storeId: string; tenantId: string },
  now: Date,
) {
  const [contract] = await db
    .select({
      limits: plans.limits,
      periodStart: subscriptions.currentPeriodStart,
      planId: plans.id,
      subscriptionId: subscriptions.id,
      subscriptionStatus: subscriptions.status,
    })
    .from(subscriptionItems)
    .innerJoin(
      subscriptions,
      eq(subscriptions.id, subscriptionItems.subscriptionId),
    )
    .innerJoin(plans, eq(plans.id, subscriptionItems.planId))
    .where(
      and(
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, input.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
        inArray(subscriptions.status, ["active", "trialing"]),
        or(
          isNull(subscriptions.currentPeriodStart),
          lte(subscriptions.currentPeriodStart, now),
        ),
        or(
          isNull(subscriptions.currentPeriodEnd),
          gt(subscriptions.currentPeriodEnd, now),
        ),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    )
    .limit(1);
  if (!contract) throw new BillingContractUnavailableError();
  return contract;
}

async function resolveLimit(
  db: DrizzleBillingQuotaClient,
  contract: {
    limits: unknown;
    planId: string;
    subscriptionId: string;
    subscriptionStatus:
      "active" | "cancelled" | "expired" | "past_due" | "trialing";
  },
  input: {
    quotaKey: BillingQuotaKey;
    storeId: string;
    tenantId: string;
  },
  now: Date,
): Promise<number | null> {
  if (input.quotaKey === "crm_zapi") {
    const [row] = await db
      .select({
        quantity: sql<number>`coalesce(sum(${subscriptionItems.quantity}), 0)`,
      })
      .from(subscriptionItems)
      .innerJoin(addons, eq(addons.id, subscriptionItems.addonId))
      .where(
        and(
          eq(subscriptionItems.itemType, "addon"),
          eq(subscriptionItems.subscriptionId, contract.subscriptionId),
          eq(subscriptionItems.storeId, input.storeId),
          eq(subscriptionItems.tenantId, input.tenantId),
          eq(addons.code, "crm_zapi"),
          eq(addons.status, "active"),
          or(
            isNull(subscriptionItems.startsAt),
            lte(subscriptionItems.startsAt, now),
          ),
          or(
            isNull(subscriptionItems.endsAt),
            gt(subscriptionItems.endsAt, now),
          ),
        ),
      );
    return Number(row?.quantity ?? 0);
  }
  if (input.quotaKey === "seller")
    return readLimit(contract.limits, "seller_limit");
  if (input.quotaKey === "vehicle")
    return readLimit(contract.limits, "vehicle_limit");
  const [feature] = await db
    .select({
      limit: planFeatures.limitValue,
      trialLimit: planFeatures.trialLimitValue,
    })
    .from(planFeatures)
    .where(
      and(
        eq(planFeatures.planId, contract.planId),
        eq(planFeatures.featureKey, "plate_lookup"),
        eq(planFeatures.included, 1),
      ),
    )
    .limit(1);
  return resolveFeatureLimit(contract.subscriptionStatus, feature);
}

export function resolveFeatureLimit(
  subscriptionStatus:
    "active" | "cancelled" | "expired" | "past_due" | "trialing",
  feature: { limit: number | null; trialLimit: number | null } | undefined,
): number | null {
  if (!feature) return null;
  return subscriptionStatus === "trialing"
    ? (feature.trialLimit ?? feature.limit)
    : feature.limit;
}

function readLimit(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const limit = (value as Record<string, unknown>)[key];
  return typeof limit === "number" && Number.isFinite(limit) ? limit : null;
}
