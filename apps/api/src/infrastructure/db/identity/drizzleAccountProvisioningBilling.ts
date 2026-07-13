import { and, desc, eq, lte, sql } from "drizzle-orm";
import {
  addons,
  billingCustomers,
  planFeatures,
  plans,
  subscriptions,
  type stores,
  type tenants,
} from "@lojaveiculosv2/db";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type { StoreProfileDraft } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";
import {
  ensureStoreAddonItem,
  ensureStorePlanItem,
} from "./drizzleAccountProvisioningBillingItems.js";

export class BillingCatalogUnavailableError extends Error {
  constructor() {
    super("No published default billing catalog is available.");
    this.name = "BillingCatalogUnavailableError";
  }
}

export async function insertBillingDefaults(
  db: DrizzleAccountProvisioningClient,
  tenant: typeof tenants.$inferSelect,
  store: typeof stores.$inferSelect,
  profile: StoreProfileDraft | undefined,
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${tenant.id}, 11))`,
  );
  const { plan, planEntitlements, trialAddons } =
    await selectPublishedCatalog(db);
  const customer = await ensureBillingCustomer(db, tenant, profile);
  const subscription = await ensureSubscription(db, tenant.id, customer.id);
  assertProvisionableSubscription(subscription);
  await ensureStorePlanItem(db, {
    planId: plan.id,
    storeId: store.id,
    subscriptionId: subscription.id,
    tenantId: tenant.id,
    unitAmountCents: plan.monthlyPriceCents,
  });
  const selectedAddons = subscription.status === "trialing" ? trialAddons : [];
  await Promise.all(
    selectedAddons.map((addon) =>
      ensureStoreAddonItem(db, {
        addonId: addon.id,
        storeId: store.id,
        subscriptionId: subscription.id,
        tenantId: tenant.id,
        unitAmountCents: addon.monthlyPriceCents,
      }),
    ),
  );
  const startsAt = subscription.currentPeriodStart ?? new Date();
  const trialing = subscription.status === "trialing";
  return {
    catalogVersion: plan.catalogVersion,
    entitlements: [
      ...planEntitlements,
      ...selectedAddons.map((addon) => addon.featureKey as EntitlementKey),
    ],
    endsAt: trialing ? subscription.currentPeriodEnd : null,
    startsAt,
    status: trialing ? ("trialing" as const) : ("active" as const),
  };
}

async function selectPublishedCatalog(db: DrizzleAccountProvisioningClient) {
  const now = new Date();
  const [plan] = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.status, "active"),
        eq(plans.isDefault, true),
        lte(plans.publishedAt, now),
      ),
    )
    .orderBy(desc(plans.publishedAt))
    .limit(1);
  if (!plan) throw new BillingCatalogUnavailableError();
  const [features, trialAddons] = await Promise.all([
    db
      .select()
      .from(planFeatures)
      .where(eq(planFeatures.planId, plan.id))
      .limit(100),
    db
      .select()
      .from(addons)
      .where(
        and(
          eq(addons.status, "active"),
          eq(addons.includedInTrial, true),
          lte(addons.publishedAt, now),
        ),
      )
      .orderBy(desc(addons.publishedAt))
      .limit(100),
  ]);
  return {
    plan,
    planEntitlements: features
      .filter((feature) => feature.included === 1)
      .map((feature) => feature.featureKey as EntitlementKey),
    trialAddons: trialAddons.filter(
      (addon) => addon.catalogVersion === plan.catalogVersion,
    ),
  };
}

function assertProvisionableSubscription(
  subscription: typeof subscriptions.$inferSelect,
) {
  if (subscription.status === "active") return;
  if (
    subscription.status === "trialing" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > new Date()
  ) {
    return;
  }
  throw new Error(
    `Cannot provision a store against a ${subscription.status} billing subscription without a future period end.`,
  );
}

async function ensureBillingCustomer(
  db: DrizzleAccountProvisioningClient,
  tenant: typeof tenants.$inferSelect,
  profile: StoreProfileDraft | undefined,
) {
  const [existing] = await db
    .select()
    .from(billingCustomers)
    .where(
      and(
        eq(billingCustomers.tenantId, tenant.id),
        eq(billingCustomers.provider, "asaas"),
      ),
    )
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(billingCustomers)
      .set({
        name: tenant.legalName ?? tenant.tradingName,
        updatedAt: new Date(),
      })
      .where(eq(billingCustomers.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  const [customer] = await db
    .insert(billingCustomers)
    .values({
      documentNumber: profile?.documentNumber ?? null,
      email: profile?.contactEmail ?? null,
      name: tenant.legalName ?? tenant.tradingName,
      provider: "asaas",
      providerCustomerId: `local_asaas_customer_${tenant.id}`,
      tenantId: tenant.id,
    })
    .onConflictDoNothing({
      target: [billingCustomers.tenantId, billingCustomers.provider],
    })
    .returning();
  if (!customer) return findBillingCustomer(db, tenant.id);
  return customer;
}

async function findBillingCustomer(
  db: DrizzleAccountProvisioningClient,
  tenantId: string,
) {
  const [customer] = await db
    .select()
    .from(billingCustomers)
    .where(
      and(
        eq(billingCustomers.tenantId, tenantId),
        eq(billingCustomers.provider, "asaas"),
      ),
    )
    .limit(1);
  if (!customer) throw new Error("Billing customer was not provisioned.");
  return customer;
}

async function ensureSubscription(
  db: DrizzleAccountProvisioningClient,
  tenantId: string,
  billingCustomerId: string,
) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (existing) return existing;

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      billingCustomerId,
      currentPeriodEnd: addDays(new Date(), 30),
      currentPeriodStart: new Date(),
      provider: "asaas",
      providerSubscriptionId: `local_asaas_subscription_${tenantId}`,
      status: "trialing",
      tenantId,
    })
    .returning();
  if (!subscription)
    throw new Error("Billing subscription was not provisioned.");
  return subscription;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
