import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type {
  BillingAddon,
  BillingEntitlementMatrixRow,
  BillingEntitlementStatus,
  BillingAuthority,
  BillingChargeableItem,
  BillingChargePreview,
  BillingFinancialSummary,
  BillingOverview,
  BillingPlan,
  BillingStoreAllocation,
  BillingSubscription,
  StoreEntitlement,
} from "../ports/billingRepository.js";
import { createChargePreview } from "./billingChargePreviewModel.js";

export const billingFeatureOrder = [
  "subdomain",
  "custom_domain",
  "crm",
  "automation",
  "analytics",
  "compliance",
  "external_api",
  "marketplace",
  "plate_lookup",
  "simulations",
  "nfe",
] satisfies EntitlementKey[];

export function createBillingOverview(input: {
  addons?: readonly BillingAddon[];
  allocations?: readonly BillingStoreAllocation[];
  authority?: BillingAuthority;
  chargeables?: readonly BillingChargeableItem[];
  chargePreview?: BillingChargePreview;
  entitlementEvents?: BillingOverview["entitlementEvents"];
  entitlements: readonly StoreEntitlement[];
  financialSummary?: BillingFinancialSummary;
  now?: Date;
  plans: readonly BillingPlan[];
  storeId: BillingOverview["storeId"];
  subscription: BillingSubscription | null;
  tenantId: BillingOverview["tenantId"];
}): BillingOverview {
  const allocations = input.allocations ?? [];
  return {
    addons: input.addons ?? [],
    allocations,
    authority: input.authority ?? defaultBillingAuthority(),
    chargePreview:
      input.chargePreview ??
      createChargePreview({
        allocations,
        ...(input.chargeables !== undefined
          ? { chargeables: input.chargeables }
          : {}),
      }),
    entitlementEvents: input.entitlementEvents ?? [],
    entitlementMatrix: createEntitlementMatrix({
      entitlements: input.entitlements,
      ...(input.now ? { now: input.now } : {}),
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

export function createBillingAuthority(input: {
  billingManagedBy?: "agency" | "store_owner";
  currentActorCanManage?: boolean;
}): BillingAuthority {
  const managedBy = input.billingManagedBy ?? "store_owner";
  const agencyManaged = managedBy === "agency";

  return {
    currentActorCanManage: input.currentActorCanManage ?? true,
    managedBy,
    managerLabel: agencyManaged ? "Agencia" : "Dono da loja",
    ownerBillingAccess: agencyManaged ? "blocked_by_agency" : "allowed",
    summary: agencyManaged
      ? "A agencia gerencia a cobranca das lojas vinculadas."
      : "O dono da loja gerencia a assinatura desta loja.",
  };
}

export function createEntitlementMatrix(input: {
  entitlements: readonly StoreEntitlement[];
  now?: Date;
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
      status: entitlement
        ? effectiveEntitlementStatus(entitlement, input.now ?? new Date())
        : "inactive",
    };
  });
}

export function isUsableEntitlement(status: BillingEntitlementStatus): boolean {
  return status === "active" || status === "trialing";
}

export function isEffectiveEntitlement(
  entitlement: Pick<StoreEntitlement, "endsAt" | "startsAt" | "status">,
  now: Date = new Date(),
) {
  return isUsableEntitlement(effectiveEntitlementStatus(entitlement, now));
}

function effectiveEntitlementStatus(
  entitlement: Pick<StoreEntitlement, "endsAt" | "startsAt" | "status">,
  now: Date,
): BillingEntitlementStatus {
  if (entitlement.startsAt && entitlement.startsAt > now) return "inactive";
  if (entitlement.endsAt && entitlement.endsAt <= now) return "inactive";
  return entitlement.status;
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

function defaultBillingAuthority(): BillingAuthority {
  return createBillingAuthority({});
}
