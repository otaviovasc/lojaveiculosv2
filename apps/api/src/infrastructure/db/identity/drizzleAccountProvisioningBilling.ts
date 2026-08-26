import { and, desc, eq, lte } from "drizzle-orm";
import {
  planFeatures,
  plans,
  subscriptionItems,
  type stores,
  type subscriptions,
  type tenants,
} from "@lojaveiculosv2/db";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type { StoreProfileDraft } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";
import {
  ensureBillingCustomer,
  ensureSubscription,
  lockBillingAccount,
} from "../billing/drizzleBillingAccount.js";
import { toStorePlanContractItem } from "../billing/drizzleBillingPlanContract.js";
import { findActiveBillingCatalogVersion } from "../billing/drizzleActiveBillingCatalog.js";

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
  await lockBillingAccount(db, tenant.id);
  const { entitlements, plan } = await selectPublishedCatalog(db);
  const customer = await ensureBillingCustomer(db, tenant, profile);
  const subscription = await ensureSubscription(db, tenant.id, customer.id);
  assertProvisionableSubscription(subscription);
  const startsAt = new Date();
  await db.insert(subscriptionItems).values(
    toStorePlanContractItem({
      plan,
      startsAt,
      storeId: store.id,
      subscription,
      tenantId: tenant.id,
    }),
  );
  return {
    catalogVersion: plan.catalogVersion,
    entitlements,
    endsAt: null,
    startsAt,
    status: "active" as const,
  };
}

async function selectPublishedCatalog(db: DrizzleAccountProvisioningClient) {
  const now = new Date();
  const catalogVersion = await findActiveBillingCatalogVersion(db);
  if (!catalogVersion) throw new BillingCatalogUnavailableError();
  const [plan] = await db
    .select()
    .from(plans)
    .where(
      and(
        eq(plans.status, "active"),
        eq(plans.catalogVersion, catalogVersion),
        eq(plans.isDefault, true),
        lte(plans.publishedAt, now),
      ),
    )
    .orderBy(desc(plans.publishedAt))
    .limit(1);
  if (!plan) throw new BillingCatalogUnavailableError();
  const features = await db
    .select()
    .from(planFeatures)
    .where(eq(planFeatures.planId, plan.id))
    .limit(100);
  return {
    entitlements: features
      .filter((feature) => Boolean(feature.included))
      .map((feature) => feature.featureKey as EntitlementKey),
    plan,
  };
}

function assertProvisionableSubscription(
  subscription: typeof subscriptions.$inferSelect,
) {
  if (subscription.status === "active") return;
  throw new Error(
    `Cannot provision a store against a ${subscription.status} billing subscription.`,
  );
}
