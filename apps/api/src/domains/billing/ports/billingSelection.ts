import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type ActivateBillingSelectionInput = {
  source: "billing_selection";
  storeId: StoreId;
  subscriptionId: string;
  tenantId: TenantId;
};
