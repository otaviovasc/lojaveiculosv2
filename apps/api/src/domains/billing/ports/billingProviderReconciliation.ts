import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type BillingProviderReconciliationKind =
  | "catalog_migration"
  | "free_fallback"
  | "subscription_cancellation"
  | "zapi_cancellation"
  | "zapi_retirement";

export type BillingProviderReconciliationTask = {
  attemptCount: number;
  id: string;
  kind: BillingProviderReconciliationKind;
  nextDueAt: Date;
  processingToken: string;
  targetProviderSubscriptionId: string | null;
  storeId: StoreId;
  subscriptionId: string;
  tenantId: TenantId;
};

export type BillingProviderReconciliationRepository = {
  claimNext: (input: {
    now: Date;
    processingToken: string;
    staleBefore: Date;
  }) => Promise<BillingProviderReconciliationTask | null>;
  markRetry: (input: {
    availableAt: Date;
    errorMessage: string;
    reconciliationId: string;
    processingToken: string;
  }) => Promise<boolean>;
  markSucceeded: (input: {
    cancelledProviderSubscriptionId?: string | null;
    completedAt: Date;
    reconciliationId: string;
    processingToken: string;
  }) => Promise<boolean>;
};
