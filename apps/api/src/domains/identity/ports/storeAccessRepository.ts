import type {
  EntitlementKey,
  PermissionKey,
  RoleKey,
  StoreId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";

export type BillingManagedBy = "agency" | "store_owner";

export type StoreAccessOrigin =
  "direct_store_membership" | "tenant_agency_fallback";

export type StoreAccessRecord = {
  accessOrigin?: StoreAccessOrigin;
  billingManagedBy: BillingManagedBy;
  entitlements: readonly EntitlementKey[];
  overrides: readonly {
    allowed: boolean;
    permission: PermissionKey;
  }[];
  role: RoleKey;
  storeId: StoreId;
  tenantId: TenantId;
  userId: UserId;
};

export type StoreAccessRepository = {
  findByClerkUserAndStoreSlug: (input: {
    clerkUserId: string;
    storeSlug: string;
  }) => Promise<StoreAccessRecord | null>;
};
