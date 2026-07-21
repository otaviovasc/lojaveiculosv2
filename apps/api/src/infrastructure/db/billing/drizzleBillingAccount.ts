import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { billingCustomers, subscriptions, tenants } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";

export type DrizzleBillingAccountClient = PostgresJsDatabase<typeof schema>;

export type BillingCustomerProfile = {
  contactEmail?: string | null;
  documentNumber?: string | null;
};

export async function ensureTenantBillingAccount(
  db: DrizzleBillingAccountClient,
  tenantId: string,
  profile?: BillingCustomerProfile,
) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error("Billing tenant was not found.");
  await lockBillingAccount(db, tenantId);
  const customer = await ensureBillingCustomer(db, tenant, profile);
  const subscription = await ensureSubscription(db, tenantId, customer.id);
  return { customer, subscription, tenant };
}

export async function lockBillingAccount(
  db: DrizzleBillingAccountClient,
  tenantId: string,
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${tenantId}, 11))`,
  );
}

export async function ensureBillingCustomer(
  db: DrizzleBillingAccountClient,
  tenant: typeof tenants.$inferSelect,
  profile: BillingCustomerProfile | undefined,
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
  db: DrizzleBillingAccountClient,
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

export async function ensureSubscription(
  db: DrizzleBillingAccountClient,
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
      currentPeriodEnd: addDays(new Date(), 14),
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
