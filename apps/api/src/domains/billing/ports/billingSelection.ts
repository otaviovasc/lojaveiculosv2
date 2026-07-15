import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type ActivateBillingSelectionInput = {
  source: "billing_selection";
  storeId: StoreId;
  subscriptionId: string;
  tenantId: TenantId;
};

export type UpdateBillingSelectionInput = {
  addonIds: readonly string[];
  billingManagedBy?: "agency" | "store_owner";
  currentActorCanManage?: boolean;
  planId: string;
  storeId: StoreId;
  tenantId: TenantId;
};
