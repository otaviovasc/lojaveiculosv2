import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { BillingSubscription } from "./billingRepository.js";

export type BillingProvider = "asaas";
export type BillingProviderEventStatus =
  "failed" | "ignored" | "processed" | "received";

export type BillingProviderWebhookEvent = {
  createdAt: Date;
  environment: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  payload: Record<string, unknown>;
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
  providerPaymentId: string;
  providerSubscriptionId: string | null;
  raw: Record<string, unknown>;
  status: BillingPaymentWebhookStatus;
};

export type SyncBillingProviderSubscriptionInput = {
  currentPeriodEnd: Date | null;
  provider: BillingProvider;
  providerSubscriptionId: string;
  status: BillingSubscription["status"];
};

export type BillingProviderSyncResult = {
  reason?: string;
  status: "ignored" | "synced";
  storeId: StoreId | null;
  tenantId: TenantId | null;
};

export type UpdateBillingProviderWebhookEventStatusInput = {
  errorMessage?: string | null;
  eventId: string;
  status: Exclude<BillingProviderEventStatus, "received">;
  storeId?: StoreId | null;
  tenantId?: TenantId | null;
};

export type BillingWebhookRepository = {
  recordReceived: (
    input: RecordBillingProviderWebhookEventInput,
  ) => Promise<RecordBillingProviderWebhookEventResult>;
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
