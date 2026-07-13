import { and, desc, eq, isNull } from "drizzle-orm";
import {
  storeEntitlements,
  storeEntitlementEvents,
  stores,
  tenants,
  vehicleListings,
} from "@lojaveiculosv2/db";
import type {
  AgencyManagedStoreOverview,
  AgencyTenantOverview,
  BillingPlan,
  BillingSubscription,
} from "../../../domains/billing/ports/billingRepository.js";
import {
  createBillingAuthority,
  createBillingOverview,
  createEntitlementMatrix,
  isEffectiveEntitlement,
} from "../../../domains/billing/readModels/billingOverviewModel.js";
import {
  findTenantSubscription,
  listAddons,
  listPlans,
} from "./drizzleBillingCatalogSupport.js";
import {
  getFinancialSummary,
  listChargeables,
} from "./drizzleBillingOverviewSupport.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function getTenantOverview(
  db: DrizzleBillingClient,
  input: {
    currentActorCanManage?: boolean;
    tenantId: string;
  },
): Promise<AgencyTenantOverview> {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, input.tenantId))
    .limit(1);
  if (!tenant) throw new Error("Tenant not found.");

  const [
    addons,
    billingPlans,
    storeRows,
    entitlementRows,
    subscription,
    events,
  ] = await Promise.all([
    listAddons(db),
    listPlans(db),
    db
      .select()
      .from(stores)
      .where(
        and(eq(stores.tenantId, input.tenantId), eq(stores.isDeleted, false)),
      )
      .limit(100),
    db
      .select()
      .from(storeEntitlements)
      .where(eq(storeEntitlements.tenantId, input.tenantId))
      .limit(500),
    findTenantSubscription(db, input),
    listTenantEntitlementEvents(db, input),
  ]);
  const [chargeables, financialSummary, vehicleRows] = await Promise.all([
    listChargeables(db, input, billingPlans, subscription),
    getFinancialSummary(db, input, subscription),
    db
      .select({ storeId: vehicleListings.storeId })
      .from(vehicleListings)
      .where(
        and(
          eq(vehicleListings.tenantId, input.tenantId),
          eq(vehicleListings.isDeleted, false),
          isNull(vehicleListings.deletedAt),
        ),
      )
      .limit(10_000),
  ]);
  const storesOverview = storeRows.map((store) =>
    toAgencyManagedStoreOverview({
      billingPlans,
      chargeables,
      entitlementRows,
      store,
      subscription,
      vehicleCount: vehicleRows.filter((row) => row.storeId === store.id)
        .length,
    }),
  );

  return {
    addons,
    allocations: storesOverview.map(toAllocation),
    authority: createBillingAuthority({
      billingManagedBy: "agency",
      currentActorCanManage: input.currentActorCanManage ?? true,
    }),
    chargePreview: createBillingOverview({
      addons,
      chargeables,
      entitlements: [],
      financialSummary,
      plans: billingPlans,
      storeId: (storeRows[0]?.id ?? "tenant") as never,
      subscription,
      tenantId: input.tenantId as never,
    }).chargePreview,
    entitlementEvents: events,
    financialSummary,
    plans: billingPlans,
    stores: storesOverview,
    subscription,
    tenant: {
      tenantId: tenant.id as never,
      tenantName: tenant.tradingName,
      tenantSlug: tenant.slug,
    },
    tenantId: input.tenantId as never,
  };
}

async function listTenantEntitlementEvents(
  db: DrizzleBillingClient,
  input: { tenantId: string },
) {
  const rows = await db
    .select()
    .from(storeEntitlementEvents)
    .where(eq(storeEntitlementEvents.tenantId, input.tenantId))
    .orderBy(desc(storeEntitlementEvents.createdAt))
    .limit(25);

  return rows.map((row) => ({
    actorId: row.actorId,
    createdAt: row.createdAt,
    featureKey: row.featureKey as never,
    id: row.id,
    metadata: toRecord(row.metadata),
    nextStatus: row.nextStatus,
    previousStatus: row.previousStatus,
    reason: row.reason,
    source: row.source,
  }));
}

function toAgencyManagedStoreOverview(input: {
  billingPlans: readonly BillingPlan[];
  chargeables: Awaited<ReturnType<typeof listChargeables>>;
  entitlementRows: (typeof storeEntitlements.$inferSelect)[];
  store: typeof stores.$inferSelect;
  subscription: BillingSubscription | null;
  vehicleCount: number;
}): AgencyManagedStoreOverview {
  const entitlements = input.entitlementRows
    .filter((row) => row.storeId === input.store.id)
    .map((row) => ({
      endsAt: row.endsAt,
      featureKey: row.featureKey as never,
      metadata: toRecord(row.metadata),
      source: row.source,
      startsAt: row.startsAt,
      status: row.status,
    }));
  const chargeables = input.chargeables.filter(
    (item) => item.storeId === input.store.id,
  );
  const planItem = chargeables.find((item) => item.itemType === "plan");
  const plan = input.billingPlans.find(
    (item) => item.id === planItem?.sourceId,
  );
  const subscription = input.subscription
    ? { ...input.subscription, plan: plan ?? null }
    : null;

  return {
    activeEntitlementCount: entitlements.filter((item) =>
      isEffectiveEntitlement(item),
    ).length,
    addonCount: chargeables.filter((item) => item.itemType === "addon").length,
    createdAt: input.store.createdAt,
    entitlementCount: entitlements.length,
    entitlementMatrix: createEntitlementMatrix({ entitlements, subscription }),
    monthlyAmountCents: chargeables.reduce(
      (sum, item) => sum + item.fullAmountCents,
      0,
    ),
    planCode: plan?.code ?? null,
    planName: planItem?.label ?? null,
    storeId: input.store.id as never,
    storeName: input.store.tradingName,
    storeSlug: input.store.publicSlug,
    subscriptionStatus: input.subscription?.status ?? null,
    vehicleCount: input.vehicleCount,
  };
}

function toAllocation(
  store: AgencyManagedStoreOverview,
): AgencyTenantOverview["allocations"][number] {
  return {
    activeEntitlementCount: store.activeEntitlementCount,
    addonCount: store.addonCount,
    monthlyAmountCents: store.monthlyAmountCents,
    planCode: store.planCode,
    planName: store.planName,
    storeId: store.storeId,
    storeName: store.storeName,
    storeSlug: store.storeSlug,
    subscriptionStatus: store.subscriptionStatus,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
