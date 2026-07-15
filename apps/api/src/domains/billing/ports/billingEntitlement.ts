import type { EntitlementKey, StoreId, TenantId } from "@lojaveiculosv2/shared";

export type BillingEntitlementStatus =
  "active" | "inactive" | "suspended" | "trialing";

export type UpdateStoreEntitlementInput = {
  actorId?: string | null;
  billingManagedBy?: "agency" | "store_owner";
  currentActorCanManage?: boolean;
  endsAt?: Date | null;
  featureKey: EntitlementKey;
  metadata?: Record<string, unknown>;
  previousStatus?: BillingEntitlementStatus | null;
  reason?: string | null;
  source: string;
  startsAt?: Date | null;
  status: BillingEntitlementStatus;
  storeId: StoreId;
  tenantId: TenantId;
};
