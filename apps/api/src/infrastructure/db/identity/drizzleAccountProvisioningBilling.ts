import { and, desc, eq, sql } from "drizzle-orm";
import {
  billingCustomers,
  planFeatures,
  plans,
  subscriptionItems,
  subscriptions,
  type stores,
  type tenants,
} from "@lojaveiculosv2/db";
import type { StoreProfileDraft } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

const growthPlan = {
  code: "growth",
  limits: { seller_limit: 8, vehicle_limit: 300 },
  monthlyPriceCents: 29900,
  name: "Growth",
  status: "active" as const,
};

const growthFeatures = [
  { featureKey: "subdomain", included: 1, limitValue: null },
  { featureKey: "crm", included: 1, limitValue: null },
  { featureKey: "plate_lookup", included: 1, limitValue: 300 },
  { featureKey: "custom_domain", included: 0, limitValue: null },
  { featureKey: "external_api", included: 0, limitValue: null },
  { featureKey: "nfe", included: 0, limitValue: null },
] as const;

export async function insertBillingDefaults(
  db: DrizzleAccountProvisioningClient,
  tenant: typeof tenants.$inferSelect,
  store: typeof stores.$inferSelect,
  profile: StoreProfileDraft | undefined,
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${tenant.id}, 11))`,
  );
  const plan = await ensureGrowthPlan(db);
  const customer = await ensureBillingCustomer(db, tenant, profile);
  const subscription = await ensureSubscription(db, tenant.id, customer.id);
  await ensureStorePlanItem(db, {
    planId: plan.id,
    storeId: store.id,
    subscriptionId: subscription.id,
    tenantId: tenant.id,
    unitAmountCents: plan.monthlyPriceCents,
  });
}

async function ensureGrowthPlan(db: DrizzleAccountProvisioningClient) {
  const [inserted] = await db
    .insert(plans)
    .values(growthPlan)
    .onConflictDoUpdate({
      set: {
        limits: growthPlan.limits,
        monthlyPriceCents: growthPlan.monthlyPriceCents,
        name: growthPlan.name,
        status: growthPlan.status,
      },
      target: plans.code,
    })
    .returning();
  const plan = inserted ?? (await findGrowthPlan(db));
  await db
    .insert(planFeatures)
    .values(growthFeatures.map((feature) => ({ ...feature, planId: plan.id })))
    .onConflictDoNothing();
  return plan;
}

async function findGrowthPlan(db: DrizzleAccountProvisioningClient) {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.code, growthPlan.code))
    .limit(1);
  if (!plan) throw new Error("Growth billing plan was not provisioned.");
  return plan;
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

async function ensureStorePlanItem(
  db: DrizzleAccountProvisioningClient,
  input: {
    planId: string;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
    unitAmountCents: number;
  },
) {
  const [existing] = await db
    .select()
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.storeId, input.storeId),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(subscriptionItems)
      .set({
        endsAt: null,
        planId: input.planId,
        quantity: 1,
        startsAt: new Date(),
        unitAmountCents: input.unitAmountCents,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionItems.id, existing.id));
    return;
  }

  await db.insert(subscriptionItems).values({
    itemType: "plan",
    planId: input.planId,
    quantity: 1,
    startsAt: new Date(),
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
    unitAmountCents: input.unitAmountCents,
  });
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
