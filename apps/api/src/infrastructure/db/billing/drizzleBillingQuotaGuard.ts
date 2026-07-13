import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  identityInvitations,
  planFeatures,
  plans,
  storeMemberships,
  subscriptionItems,
  subscriptions,
  vehicleListings,
  vehiclePlateLookups,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import {
  BillingContractUnavailableError,
  BillingQuotaExceededError,
  type BillingQuotaGuard,
  type BillingQuotaKey,
} from "../../../domains/billing/ports/billingQuotaGuard.js";

export type DrizzleBillingQuotaClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleBillingQuotaGuard(
  db: DrizzleBillingQuotaClient,
  now: () => Date = () => new Date(),
): BillingQuotaGuard {
  return {
    async assertAvailable(input) {
      const checkedAt = now();
      await db.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${input.storeId}:${input.quotaKey}`}, 29))`,
      );
      const contract = await findEffectiveContract(db, input, checkedAt);
      const limit = await resolveLimit(db, contract, input.quotaKey);
      if (limit === null) return;
      const current = await countUsage(db, input, contract.periodStart);
      if (current + (input.increment ?? 1) <= limit) return;
      throw new BillingQuotaExceededError({
        current,
        limit,
        quotaKey: input.quotaKey,
      });
    },
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
  contract: { limits: unknown; planId: string },
  quotaKey: BillingQuotaKey,
): Promise<number | null> {
  if (quotaKey === "seller") return readLimit(contract.limits, "seller_limit");
  if (quotaKey === "vehicle")
    return readLimit(contract.limits, "vehicle_limit");
  const [feature] = await db
    .select({ limit: planFeatures.limitValue })
    .from(planFeatures)
    .where(
      and(
        eq(planFeatures.planId, contract.planId),
        eq(planFeatures.featureKey, "plate_lookup"),
        eq(planFeatures.included, 1),
      ),
    )
    .limit(1);
  return feature?.limit ?? null;
}

async function countUsage(
  db: DrizzleBillingQuotaClient,
  input: { quotaKey: BillingQuotaKey; storeId: string; tenantId: string },
  periodStart: Date | null,
) {
  if (input.quotaKey === "seller") {
    const [[members], [invitations]] = await Promise.all([
      db
        .select({ value: count() })
        .from(storeMemberships)
        .where(
          and(
            eq(storeMemberships.storeId, input.storeId),
            eq(storeMemberships.tenantId, input.tenantId),
            eq(storeMemberships.status, "active"),
          ),
        ),
      db
        .select({ value: count() })
        .from(identityInvitations)
        .where(
          and(
            eq(identityInvitations.storeId, input.storeId),
            eq(identityInvitations.tenantId, input.tenantId),
            inArray(identityInvitations.status, ["pending", "sent"]),
          ),
        ),
    ]);
    return Number(members?.value ?? 0) + Number(invitations?.value ?? 0);
  }
  if (input.quotaKey === "vehicle") {
    const [row] = await db
      .select({ value: count() })
      .from(vehicleListings)
      .where(
        and(
          eq(vehicleListings.storeId, input.storeId),
          eq(vehicleListings.tenantId, input.tenantId),
          eq(vehicleListings.isDeleted, false),
        ),
      );
    return Number(row?.value ?? 0);
  }
  const [row] = await db
    .select({ value: count() })
    .from(vehiclePlateLookups)
    .where(
      and(
        eq(vehiclePlateLookups.storeId, input.storeId),
        eq(vehiclePlateLookups.tenantId, input.tenantId),
        ...(periodStart
          ? [gte(vehiclePlateLookups.fetchedAt, periodStart)]
          : []),
      ),
    );
  return Number(row?.value ?? 0);
}

function readLimit(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const limit = (value as Record<string, unknown>)[key];
  return typeof limit === "number" && Number.isFinite(limit) ? limit : null;
}
