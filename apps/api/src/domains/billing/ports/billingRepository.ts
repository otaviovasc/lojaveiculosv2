import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ActivateBillingSelectionInput } from "./billingSelection.js";
import type { UpdateStoreEntitlementInput } from "./billingEntitlement.js";
import type {
  AgencyTenantOverview,
  BillingOverview,
} from "./billingOverview.js";

export * from "./billingCatalog.js";
export type {
  BillingEntitlementStatus,
  UpdateStoreEntitlementInput,
} from "./billingEntitlement.js";
export * from "./billingOverview.js";

export type BillingRepository = {
  activateSubscriptionSelection: (
    input: ActivateBillingSelectionInput,
  ) => Promise<void>;
  getOverview: (input: {
    billingManagedBy?: "agency" | "store_owner";
    currentActorCanManage?: boolean;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingOverview>;
  getTenantOverview: (input: {
    currentActorCanManage?: boolean;
    tenantId: TenantId;
  }) => Promise<AgencyTenantOverview>;
  storeExistsInTenant: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<boolean>;
  updateStoreEntitlement: (
    input: UpdateStoreEntitlementInput,
  ) => Promise<BillingOverview>;
};
