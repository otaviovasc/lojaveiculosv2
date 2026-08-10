import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { BillingAddonContract } from "./billingAddonContract.js";
import type {
  ActivateBillingSelectionInput,
  UpdateBillingSelectionInput,
} from "./billingSelection.js";
import type { UpdateStoreEntitlementInput } from "./billingEntitlement.js";
import type {
  AgencyTenantOverview,
  BillingOverview,
} from "./billingOverview.js";

export * from "./billingAddonContract.js";
export * from "./billingCatalog.js";
export type {
  BillingEntitlementStatus,
  UpdateStoreEntitlementInput,
} from "./billingEntitlement.js";
export * from "./billingOverview.js";
export type { UpdateBillingSelectionInput } from "./billingSelection.js";

export type BillingRepository = {
  activateSubscriptionSelection: (
    input: ActivateBillingSelectionInput,
  ) => Promise<void>;
  cancelZapiAddon?: (input: {
    effectiveAt: Date;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingAddonContract>;
  confirmZapiAddonCancellationSync?: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingAddonContract>;
  completeZapiAddonSetup?: (input: {
    connectionId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingAddonContract>;
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
  markZapiAddonScheduled?: (input: {
    contractId: string;
    expectedRenewalAmountCents: number;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingAddonContract>;
  requestZapiAddon?: (input: {
    addonId: string;
    scheduledFor: Date;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<BillingAddonContract>;
  storeExistsInTenant: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<boolean>;
  updateSubscriptionSelection: (
    input: UpdateBillingSelectionInput,
  ) => Promise<BillingOverview>;
  updateStoreEntitlement: (
    input: UpdateStoreEntitlementInput,
  ) => Promise<BillingOverview>;
};
