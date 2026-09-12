import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  storeEntitlements,
  storeEntitlementEvents,
  stores,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  BillingOverview,
  BillingRepository,
} from "../../../domains/billing/ports/billingRepository.js";
import {
  createBillingAuthority,
  createBillingOverview,
} from "../../../domains/billing/readModels/billingOverviewModel.js";
import { getTenantOverview } from "./drizzleAgencyBillingOverviewSupport.js";
import { findActiveBillingCatalogVersion } from "./drizzleActiveBillingCatalog.js";
import { listAddons, listPlans } from "./drizzleBillingCatalogSupport.js";
import {
  getFinancialSummary,
  listChargeables,
  listEntitlementEvents,
} from "./drizzleBillingOverviewSupport.js";
import { listStoreScopedAllocations } from "./drizzleStoreBillingAllocationSupport.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import {
  findSubscription,
  listEntitlements,
} from "./drizzleBillingRepositoryReads.js";

export type DrizzleBillingClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleBillingRepository(
  db: DrizzleBillingClient,
): BillingRepository {
  return {
    async activateSubscriptionSelection(input) {
      await db.transaction((tx) =>
        projectSelectedEntitlements(tx as DrizzleBillingClient, input),
      );
    },
    async getOverview(input) {
      return getOverview(db, input);
    },
    async getTenantOverview(input) {
      return getTenantOverview(db, input);
    },
    async storeExistsInTenant(input) {
      const [store] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(
            eq(stores.id, input.storeId),
            eq(stores.tenantId, input.tenantId),
            eq(stores.isDeleted, false),
            isNull(stores.deletedAt),
          ),
        )
        .limit(1);
      return Boolean(store);
    },
    async updateStoreEntitlement(input) {
      return db.transaction(async (tx) => {
        const txDb = tx as DrizzleBillingClient;
        const before = await listEntitlements(txDb, input);
        const beforeEntitlement = before.find(
          (entitlement) => entitlement.featureKey === input.featureKey,
        );

        await txDb
          .insert(storeEntitlements)
          .values({
            endsAt: input.endsAt ?? null,
            featureKey: input.featureKey,
            metadata: input.metadata ?? {},
            source: input.source,
            startsAt: input.startsAt ?? null,
            status: input.status,
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
          .onConflictDoUpdate({
            set: {
              endsAt: input.endsAt ?? null,
              metadata: input.metadata ?? {},
              source: input.source,
              startsAt: input.startsAt ?? null,
              status: input.status,
            },
            target: [storeEntitlements.storeId, storeEntitlements.featureKey],
          });

        await txDb.insert(storeEntitlementEvents).values({
          actorId: input.actorId ?? null,
          featureKey: input.featureKey,
          metadata: input.metadata ?? {},
          nextStatus: input.status,
          previousStatus:
            input.previousStatus ?? beforeEntitlement?.status ?? null,
          reason: input.reason ?? null,
          source: input.source,
          storeId: input.storeId,
          tenantId: input.tenantId,
        });

        return getOverview(txDb, input);
      });
    },
  };
}

async function getOverview(
  db: DrizzleBillingClient,
  input: {
    billingManagedBy?: "agency" | "store_owner";
    currentActorCanManage?: boolean;
    storeId: string;
    tenantId: string;
  },
): Promise<BillingOverview> {
  const catalogVersion = await findActiveBillingCatalogVersion(db);
  const [addons, billingPlans, entitlements, subscription, events] =
    await Promise.all([
      listAddons(db, catalogVersion),
      listPlans(db, catalogVersion),
      listEntitlements(db, input),
      findSubscription(db, input),
      listEntitlementEvents(db, input),
    ]);
  const [allocations, chargeables, financialSummary] = await Promise.all([
    listStoreScopedAllocations(db, input, billingPlans, subscription),
    listChargeables(db, input, billingPlans, subscription),
    getFinancialSummary(db, input, subscription),
  ]);

  return createBillingOverview({
    addons,
    allocations,
    authority: createBillingAuthority({
      ...(input.billingManagedBy
        ? { billingManagedBy: input.billingManagedBy }
        : {}),
      ...(typeof input.currentActorCanManage === "boolean"
        ? { currentActorCanManage: input.currentActorCanManage }
        : {}),
    }),
    chargeables,
    entitlementEvents: events,
    entitlements,
    plans: billingPlans,
    storeId: input.storeId as never,
    financialSummary,
    subscription,
    tenantId: input.tenantId as never,
  });
}
