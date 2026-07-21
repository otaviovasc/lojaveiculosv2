import { and, desc, eq, lte } from "drizzle-orm";
import {
  addons,
  planFeatures,
  plans,
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
  const { plan, trialEntitlements } = await selectPublishedCatalog(db);
  const customer = await ensureBillingCustomer(db, tenant, profile);
  const subscription = await ensureSubscription(db, tenant.id, customer.id);
  assertProvisionableSubscription(subscription);
  const startsAt = subscription.currentPeriodStart ?? new Date();
  const trialing = subscription.status === "trialing";
  return {
    catalogVersion: plan.catalogVersion,
    entitlements: trialing ? trialEntitlements : [],
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
    trialEntitlements: [
      ...features
        .filter((feature) => feature.includedInTrial)
        .map((feature) => feature.featureKey as EntitlementKey),
      ...trialAddons
        .filter((addon) => addon.catalogVersion === plan.catalogVersion)
        .map((addon) => addon.featureKey as EntitlementKey),
    ],
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
