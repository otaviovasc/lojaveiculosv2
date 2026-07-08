import type {
  BillingOverview,
  BillingEntitlementStatus,
  EntitlementKey,
} from "../../billing/types";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { AgencyTenantOverview } from "../apiClient";

export type AgencyBillingStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { featureKey: EntitlementKey; kind: "saving" }
  | { kind: "syncing" };

export function createAgencyBillingPanelOverview(
  overview: AgencyTenantOverview | null,
  selectedStoreId: string | null,
): BillingOverview | null {
  if (!overview) return null;
  const selectedStore =
    overview.stores.find((store) => store.storeId === selectedStoreId) ??
    overview.stores[0] ??
    null;
  const selectedPlan = selectedStore?.planCode
    ? (overview.plans.find((plan) => plan.code === selectedStore.planCode) ??
      null)
    : null;

  return {
    allocations: overview.allocations,
    authority: overview.authority,
    chargePreview: overview.chargePreview,
    entitlementEvents: overview.entitlementEvents,
    entitlementMatrix: selectedStore?.entitlementMatrix ?? [],
    entitlements: [],
    financialSummary: overview.financialSummary,
    plans: overview.plans,
    storeId: selectedStore?.storeId ?? "",
    subscription: overview.subscription
      ? { ...overview.subscription, plan: selectedPlan }
      : null,
    tenantId: overview.tenantId,
  };
}

export function agencyBillingDefaultReason(status: BillingEntitlementStatus) {
  return status === "active"
    ? "Entitlement enabled from agency billing console."
    : "Entitlement changed from agency billing console.";
}

export function agencyBillingErrorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar o faturamento da agencia.",
  );
}
