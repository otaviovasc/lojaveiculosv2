import type * as schema from "@lojaveiculosv2/db";
import type { billingCatalogVersions } from "@lojaveiculosv2/db";
import { addons, planFeatures, plans } from "@lojaveiculosv2/db";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import { eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  BillingCatalogAddonLimits,
  BillingCatalogDefinition,
} from "../../../domains/billing/catalog/billingCatalogDefinition.js";

export type BillingCatalogDeploymentClient = PostgresJsDatabase<typeof schema>;
export type BillingCatalogVersionRow =
  typeof billingCatalogVersions.$inferSelect;

export async function loadPersistedBillingCatalog(
  db: BillingCatalogDeploymentClient,
  versionRow: BillingCatalogVersionRow,
): Promise<BillingCatalogDefinition> {
  const planRows = await db
    .select()
    .from(plans)
    .where(eq(plans.catalogVersion, versionRow.version));
  const planIds = planRows.map((plan) => plan.id);
  const [featureRows, addonRows] = await Promise.all([
    planIds.length
      ? db
          .select()
          .from(planFeatures)
          .where(inArray(planFeatures.planId, planIds))
      : [],
    db
      .select()
      .from(addons)
      .where(eq(addons.catalogVersion, versionRow.version)),
  ]);

  return {
    addons: addonRows.map((addon) => ({
      code: addon.code,
      featureKey: addon.featureKey as EntitlementKey,
      id: addon.id,
      includedInTrial: addon.includedInTrial,
      limits: fromDatabaseAddonLimits(addon.limits),
      monthlyPriceCents: addon.monthlyPriceCents,
      name: addon.name,
      status: addon.status,
    })),
    plans: planRows.map((plan) => ({
      capabilities: fromDatabaseCapabilities(plan.limits),
      checkoutMode: fromDatabaseCheckoutMode(plan.limits),
      code: plan.code,
      features: featureRows
        .filter((feature) => feature.planId === plan.id)
        .map((feature) => ({
          featureKey: feature.featureKey as EntitlementKey,
          included: feature.included === 1,
          includedInTrial: feature.includedInTrial,
          limitValue: feature.limitValue,
          trialLimitValue: feature.trialLimitValue,
        })),
      id: plan.id,
      isDefault: plan.isDefault,
      limits: fromDatabasePlanLimits(plan.limits),
      monthlyPriceCents: plan.monthlyPriceCents,
      name: plan.name,
      selectionRank: fromDatabaseSelectionRank(plan.limits),
      status: plan.status,
    })),
    publishedAt: versionRow.publishedAt.toISOString(),
    version: versionRow.version,
  };
}

export function toDatabaseAddonLimits(limits: BillingCatalogAddonLimits) {
  return {
    ...(limits.composioToolExecutionsPerBillingMonth !== undefined
      ? {
          composio_tool_executions_per_billing_month:
            limits.composioToolExecutionsPerBillingMonth,
        }
      : {}),
    ...(limits.enforcement !== undefined
      ? { enforcement: limits.enforcement }
      : {}),
    ...(limits.includedChannels !== undefined
      ? { included_channels: [...limits.includedChannels] }
      : {}),
  };
}

function fromDatabaseAddonLimits(value: unknown): BillingCatalogAddonLimits {
  const limits = asRecord(value);
  const executionLimit = limits.composio_tool_executions_per_billing_month;
  const enforcement = limits.enforcement;
  const includedChannels = Array.isArray(limits.included_channels)
    ? limits.included_channels.filter(
        (channel): channel is "instagram" | "whatsapp_official" =>
          channel === "instagram" || channel === "whatsapp_official",
      )
    : undefined;
  return {
    ...(typeof executionLimit === "number"
      ? { composioToolExecutionsPerBillingMonth: executionLimit }
      : {}),
    ...(enforcement === "hard" || enforcement === "soft"
      ? { enforcement }
      : {}),
    ...(includedChannels ? { includedChannels } : {}),
  };
}

function fromDatabasePlanLimits(value: unknown) {
  const limits = asRecord(value);
  return {
    sellerLimit: nullableNumber(limits.seller_limit, "seller_limit"),
    vehicleLimit: nullableNumber(limits.vehicle_limit, "vehicle_limit"),
  };
}

function fromDatabaseCapabilities(value: unknown): readonly string[] {
  const capabilities = asRecord(value).capabilities;
  return Array.isArray(capabilities)
    ? capabilities.filter((item): item is string => typeof item === "string")
    : [];
}

function fromDatabaseCheckoutMode(
  value: unknown,
): "checkout" | "free" | "quote_required" {
  const mode = asRecord(value).checkout_mode;
  return mode === "free" || mode === "quote_required" ? mode : "checkout";
}

function fromDatabaseSelectionRank(value: unknown): number {
  const rank = asRecord(value).selection_rank;
  return typeof rank === "number" && Number.isInteger(rank) ? rank : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function nullableNumber(value: unknown, key: string): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`Persisted billing catalog is missing numeric ${key}.`);
}
