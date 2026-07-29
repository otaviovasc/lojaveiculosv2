import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnectionProvider } from "./crmConnectionRepository.js";

export type CrmProviderWebhookEventStatus =
  "failed" | "ignored" | "processed" | "received";

export type CrmProviderWebhookEventProvider = CrmConnectionProvider;

export type CrmProviderWebhookEvent = {
  connectionId: string | null;
  createdAt: Date;
  environment: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  payload: Record<string, unknown>;
  processedAt: Date | null;
  provider: CrmProviderWebhookEventProvider;
  providerEventId: string;
  status: CrmProviderWebhookEventStatus;
  storeId: StoreId | null;
  tenantId: TenantId | null;
  updatedAt: Date;
};

export type RecordCrmProviderWebhookEventInput = {
  connectionId?: string | null;
  environment: string;
  eventType: string;
  payload: Record<string, unknown>;
  provider: CrmProviderWebhookEventProvider;
  providerEventId: string;
  storeId?: StoreId | null;
  tenantId?: TenantId | null;
};

export type ListCrmProviderWebhookEventsInput = {
  connectionId?: string | null;
  eventType?: string;
  limit?: number;
  offset?: number;
  provider?: CrmProviderWebhookEventProvider;
  status?: CrmProviderWebhookEventStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmProviderWebhookEventInput = {
  eventId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type RecordCrmProviderWebhookEventResult = {
  created: boolean;
  event: CrmProviderWebhookEvent;
};

export type UpdateCrmProviderWebhookEventStatusInput = {
  errorMessage?: string | null;
  eventId: string;
  status: Exclude<CrmProviderWebhookEventStatus, "received">;
};

export type CrmWebhookEventRepository = {
  findById: (
    input: FindCrmProviderWebhookEventInput,
  ) => Promise<CrmProviderWebhookEvent | null>;
  list: (
    input: ListCrmProviderWebhookEventsInput,
  ) => Promise<readonly CrmProviderWebhookEvent[]>;
  recordReceived: (
    input: RecordCrmProviderWebhookEventInput,
  ) => Promise<RecordCrmProviderWebhookEventResult>;
  updateStatus: (
    input: UpdateCrmProviderWebhookEventStatusInput,
  ) => Promise<CrmProviderWebhookEvent | null>;
};
