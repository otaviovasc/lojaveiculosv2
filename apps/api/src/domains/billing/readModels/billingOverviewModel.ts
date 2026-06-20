import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type {
  BillingEntitlementMatrixRow,
  BillingEntitlementStatus,
  BillingFinancialSummary,
  BillingOverview,
  BillingPlan,
  BillingStoreAllocation,
  BillingSubscription,
  StoreEntitlement,
} from "../ports/billingRepository.js";

export const billingFeatureOrder = [
  "subdomain",
  "custom_domain",
  "crm",
  "external_api",
  "marketplace",
  "plate_lookup",
  "nfe",
] satisfies EntitlementKey[];

export function createBillingOverview(input: {
  allocations?: readonly BillingStoreAllocation[];
  entitlementEvents?: BillingOverview["entitlementEvents"];
  entitlements: readonly StoreEntitlement[];
  financialSummary?: BillingFinancialSummary;
  plans: readonly BillingPlan[];
  storeId: BillingOverview["storeId"];
  subscription: BillingSubscription | null;
  tenantId: BillingOverview["tenantId"];
}): BillingOverview {
  return {
    allocations: input.allocations ?? [],
    entitlementEvents: input.entitlementEvents ?? [],
    entitlementMatrix: createEntitlementMatrix({
      entitlements: input.entitlements,
      subscription: input.subscription,
    }),
    entitlements: input.entitlements,
    financialSummary: input.financialSummary ?? emptyFinancialSummary(),
    plans: input.plans,
    storeId: input.storeId,
    subscription: input.subscription,
    tenantId: input.tenantId,
  };
}

export function createEntitlementMatrix(input: {
  entitlements: readonly StoreEntitlement[];
  subscription: BillingSubscription | null;
}): BillingEntitlementMatrixRow[] {
  return billingFeatureOrder.map((featureKey) => {
    const entitlement = input.entitlements.find(
      (item) => item.featureKey === featureKey,
    );
    const planFeature = input.subscription?.plan?.features.find(
      (feature) => feature.featureKey === featureKey,
    );

    return {
      endsAt: entitlement?.endsAt ?? null,
      featureKey,
      includedInPlan: planFeature?.included ?? false,
      limitValue: entitlementLimit(
        entitlement,
        planFeature?.limitValue ?? null,
      ),
      source: entitlement?.source ?? null,
      startsAt: entitlement?.startsAt ?? null,
      status: entitlement?.status ?? "inactive",
    };
  });
}

export function isUsableEntitlement(status: BillingEntitlementStatus): boolean {
  return status === "active" || status === "trialing";
}

function entitlementLimit(
  entitlement: StoreEntitlement | undefined,
  planLimit: number | null,
) {
  const metadataLimit = entitlement?.metadata.limitValue;
  return typeof metadataLimit === "number" ? metadataLimit : planLimit;
}

function emptyFinancialSummary(): BillingFinancialSummary {
  return {
    monthlyRecurringCents: 0,
    nextDueAt: null,
    openInvoiceCount: 0,
    overdueInvoiceCount: 0,
    paidThisPeriodCents: 0,
  };
}
