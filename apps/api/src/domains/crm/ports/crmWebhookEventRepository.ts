import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnectionProvider } from "./crmConnectionRepository.js";

export type CrmProviderWebhookEventStatus =
  "failed" | "ignored" | "processed" | "processing" | "received";

export type CrmProviderWebhookEventProvider = CrmConnectionProvider;

export type CrmWebhookEffectType =
  "audit_accepted" | "bot_message" | "realtime_message" | "realtime_session";

export type CrmWebhookEffect = {
  connectionId: string;
  deadLetteredAt: Date | null;
  deliveredAt: Date | null;
  effectType: CrmWebhookEffectType;
  id: string;
  lastErrorCode: string | null;
  messageId: string;
  nextAttemptAt: Date;
  processingAttempts: number;
  processingStartedAt: Date | null;
  processingToken: string | null;
  providerEventId: string;
  sequence: number;
  sessionId: string;
  status: "dead_letter" | "delivered" | "failed" | "pending" | "processing";
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmProviderWebhookEvent = {
  connectionId: string | null;
  createdAt: Date;
  environment: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  payload: Record<string, unknown>;
  payloadDigest: string | null;
  processingAttempts: number;
  processingStartedAt: Date | null;
  processingToken: string | null;
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
  payloadDigest?: string | null;
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
  divergentReplay: boolean;
  event: CrmProviderWebhookEvent;
};

export type UpdateCrmProviderWebhookEventStatusInput = {
  errorMessage?: string | null;
  eventId: string;
  payload?: Record<string, unknown>;
  processingToken?: string;
  status: Exclude<CrmProviderWebhookEventStatus, "processing" | "received">;
};

export type CrmWebhookEventRepository = {
  claimDueEvents: (input: {
    eventType: string;
    limit: number;
    maxAttempts: number;
    now: Date;
    processingToken: string;
    provider: CrmProviderWebhookEventProvider;
    staleBefore: Date;
  }) => Promise<readonly CrmProviderWebhookEvent[]>;
  claimDueEffects: (input: {
    limit: number;
    maxAttempts: number;
    now: Date;
    processingToken: string;
    staleBefore: Date;
  }) => Promise<readonly CrmWebhookEffect[]>;
  claimEffect: (input: {
    effectId: string;
    maxAttempts: number;
    now: Date;
    processingStartedAt: Date;
    processingToken: string;
    staleBefore: Date;
  }) => Promise<CrmWebhookEffect | null>;
  claimForProcessing: (input: {
    allowIgnored?: boolean;
    eventId: string;
    processingStartedAt: Date;
    processingToken: string;
    staleBefore: Date;
  }) => Promise<CrmProviderWebhookEvent | null>;
  findById: (
    input: FindCrmProviderWebhookEventInput,
  ) => Promise<CrmProviderWebhookEvent | null>;
  completeEffect: (input: {
    deliveredAt: Date;
    effectId: string;
    processingToken: string;
  }) => Promise<CrmWebhookEffect | null>;
  failEffect: (input: {
    deadLetteredAt: Date | null;
    effectId: string;
    lastErrorCode: string;
    nextAttemptAt: Date;
    processingToken: string;
    status: "dead_letter" | "failed";
  }) => Promise<CrmWebhookEffect | null>;
  listEffects: (
    providerEventId: string,
  ) => Promise<readonly CrmWebhookEffect[]>;
  list: (
    input: ListCrmProviderWebhookEventsInput,
  ) => Promise<readonly CrmProviderWebhookEvent[]>;
  recordReceived: (
    input: RecordCrmProviderWebhookEventInput,
  ) => Promise<RecordCrmProviderWebhookEventResult>;
  stageEffects: (input: {
    connectionId: string;
    effects: readonly { effectType: CrmWebhookEffectType; sequence: number }[];
    messageId: string;
    providerEventId: string;
    sessionId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<readonly CrmWebhookEffect[]>;
  updateStatus: (
    input: UpdateCrmProviderWebhookEventStatusInput,
  ) => Promise<CrmProviderWebhookEvent | null>;
};
