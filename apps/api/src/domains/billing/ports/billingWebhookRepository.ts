import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { BillingSubscription } from "./billingRepository.js";

export type BillingProvider = "asaas";
export type BillingProviderEventStatus =
  | "failed"
  | "ignored"
  | "pending_reconciliation"
  | "processed"
  | "processing"
  | "received";

export type BillingProviderWebhookEvent = {
  createdAt: Date;
  environment: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  payload: Record<string, unknown>;
  processingAttempts: number;
  processingStartedAt: Date | null;
  processingToken: string | null;
  processedAt: Date | null;
  provider: BillingProvider;
  providerEventId: string;
  status: BillingProviderEventStatus;
  storeId: StoreId | null;
  tenantId: TenantId | null;
  updatedAt: Date;
};

export type RecordBillingProviderWebhookEventInput = {
  environment: string;
  eventType: string;
  payload: Record<string, unknown>;
  provider: BillingProvider;
  providerEventId: string;
};

export type RecordBillingProviderWebhookEventResult = {
  created: boolean;
  event: BillingProviderWebhookEvent;
};

export type BillingPaymentWebhookStatus =
  "cancelled" | "overdue" | "paid" | "pending" | "refunded";

export type UpsertBillingProviderPaymentInput = {
  amountCents: number;
  dueAt: Date | null;
  externalReference: string | null;
  invoiceUrl: string | null;
  paidAt: Date | null;
  provider: BillingProvider;
  providerCustomerId: string | null;
  providerCheckoutId?: string | null;
  providerPaymentId: string;
  providerEventId: string;
  providerSubscriptionId: string | null;
  raw: Record<string, unknown>;
  requestId?: string;
  status: BillingPaymentWebhookStatus;
};

export type SyncBillingProviderSubscriptionInput = {
  currentPeriodEnd: Date | null;
  eventOccurredAt?: Date | null;
  externalReference: string | null;
  provider: BillingProvider;
  providerEventId?: string;
  providerSubscriptionId: string;
  status: BillingSubscription["status"] | "unknown";
};

export type SyncBillingProviderCheckoutInput = {
  currentPeriodEnd: Date | null;
  provider: BillingProvider;
  providerCheckoutId: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  raw: Record<string, unknown>;
  status: "cancelled" | "created" | "expired" | "paid";
};

export type BillingProviderSyncResult = {
  reason?: string;
  status: "ignored" | "pending_reconciliation" | "synced";
  storeId: StoreId | null;
  tenantId: TenantId | null;
};

export type UpdateBillingProviderWebhookEventStatusInput = {
  errorMessage?: string | null;
  eventId: string;
  processingToken?: string;
  status: Exclude<BillingProviderEventStatus, "processing" | "received">;
  storeId?: StoreId | null;
  tenantId?: TenantId | null;
};

export type BillingWebhookRepository = {
  claimForProcessing: (input: {
    eventId: string;
    processingStartedAt: Date;
    processingToken: string;
    staleBefore: Date;
  }) => Promise<BillingProviderWebhookEvent | null>;
  recordReceived: (
    input: RecordBillingProviderWebhookEventInput,
  ) => Promise<RecordBillingProviderWebhookEventResult>;
  syncProviderCheckout: (
    input: SyncBillingProviderCheckoutInput,
  ) => Promise<BillingProviderSyncResult>;
  syncProviderSubscription: (
    input: SyncBillingProviderSubscriptionInput,
  ) => Promise<BillingProviderSyncResult>;
  updateStatus: (
    input: UpdateBillingProviderWebhookEventStatusInput,
  ) => Promise<BillingProviderWebhookEvent | null>;
  upsertProviderPayment: (
    input: UpsertBillingProviderPaymentInput,
  ) => Promise<BillingProviderSyncResult>;
};
