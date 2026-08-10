import type { TenantId } from "@lojaveiculosv2/shared";

export type BillingProviderReconciliationKind =
  "catalog_migration" | "zapi_cancellation";

export type BillingProviderReconciliationTask = {
  attemptCount: number;
  id: string;
  kind: BillingProviderReconciliationKind;
  nextDueAt: Date;
  processingToken: string;
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
    completedAt: Date;
    reconciliationId: string;
    processingToken: string;
  }) => Promise<boolean>;
};
