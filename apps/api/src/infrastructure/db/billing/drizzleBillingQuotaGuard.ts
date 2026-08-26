import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
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
import {
  createDrizzleBillingQuotaReservationMethods,
  resolveQuotaUsageWindow,
} from "./drizzleBillingQuotaReservations.js";

export { resolveQuotaUsageWindow } from "./drizzleBillingQuotaReservations.js";

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
    const resolution = await resolveQuotaContract(db, input, checkedAt);
    const limit = await resolveLimit(db, resolution.contract, input);
    const used = await countBillingQuotaUsage(
      db,
      input,
      resolveQuotaUsageWindow(input.quotaKey, checkedAt),
    );
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
      const resolution = await resolveQuotaContract(db, input, checkedAt);
      const limit = await resolveLimit(db, resolution.contract, input);
      if (limit === null) return;
      const current = await countBillingQuotaUsage(
        db,
        input,
        resolveQuotaUsageWindow(input.quotaKey, checkedAt),
      );
      if (current + (input.increment ?? 1) <= limit) return;
      throw new BillingQuotaExceededError({
        current,
        limit,
        quotaKey: input.quotaKey,
      });
    },
    ...createDrizzleBillingQuotaReservationMethods(
      db,
      now,
      async (client, input, checkedAt) => {
        const resolution = await resolveQuotaContract(client, input, checkedAt);
        return resolveLimit(client, resolution.contract, input);
      },
    ),
    getAllowance,
  };
}

async function resolveQuotaContract(
  db: DrizzleBillingQuotaClient,
  input: { quotaKey: BillingQuotaKey; storeId: string; tenantId: string },
  now: Date,
) {
  try {
    return {
      contract: await findEffectiveContract(db, input, now),
      kind: "subscription" as const,
    };
  } catch (error) {
    if (!(error instanceof BillingContractUnavailableError)) throw error;
    return {
      contract: await findFreeFallbackContract(db, now),
      kind: "free_fallback" as const,
    };
  }
}

async function findFreeFallbackContract(
  db: DrizzleBillingQuotaClient,
  now: Date,
) {
  const [plan] = await db
    .select({ limits: plans.limits, planId: plans.id })
    .from(plans)
    .where(
      and(
        eq(plans.catalogVersion, "2026-08-v3"),
        eq(plans.code, "free"),
        eq(plans.status, "active"),
        lte(plans.publishedAt, now),
      ),
    )
    .limit(1);
  if (!plan) throw new BillingContractUnavailableError();
  return {
    ...plan,
    subscriptionId: "free-fallback",
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
      planId: plans.id,
      subscriptionId: subscriptions.id,
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
        inArray(subscriptions.status, ["active", "past_due"]),
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
  },
  input: {
    quotaKey: BillingQuotaKey;
  },
): Promise<number | null> {
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
  return resolveFeatureLimit(feature);
}

export function resolveFeatureLimit(
  feature: { limit: number | null; trialLimit: number | null } | undefined,
): number | null {
  if (!feature) return null;
  return feature.limit;
}

function readLimit(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const limit = (value as Record<string, unknown>)[key];
  return typeof limit === "number" && Number.isFinite(limit) ? limit : null;
}
