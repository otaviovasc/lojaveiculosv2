import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { CrmScheduledMessageStatus } from "./crmConversationRepositoryModels.js";

export type CreateCrmScheduledMessageInput = {
  campaignId?: string | null;
  campaignMessageType?: string | null;
  campaignRecipientKey?: string | null;
  campaignSequence?: number | null;
  connectionId: string;
  createdByUserId?: UserId | null;
  metadata?: Record<string, unknown>;
  recipientAddress: string;
  scheduledAt: Date;
  cycleId: string;
  storeId: StoreId;
  tenantId: TenantId;
  content: string;
};

export type ListCrmScheduledMessagesInput = {
  campaignBookkeepingPending?: boolean;
  campaignId?: string;
  connectionId?: string;
  limit: number;
  /** Wall clock used for pending campaign-bookkeeping backoff evaluation. */
  now?: Date;
  scheduledMessageId?: string;
  cycleId?: string;
  status?: CrmScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindDueCrmScheduledMessagesInput = {
  dueAt: Date;
  limit: number;
  /** Wall clock used for lease/backoff evaluation; never derive this from dueAt. */
  now?: Date;
  /** Enabled special-date config snapshots used to filter stale revisions before LIMIT. */
  specialDateConfigs?: readonly {
    id: string;
    revision: number;
  }[];
  staleBefore?: Date;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindDueCrmScheduledMessageScopesInput = {
  dueAt: Date;
  limit: number;
  /** Wall clock used for lease/backoff evaluation; never derive this from dueAt. */
  now?: Date;
  /** Enabled special-date config snapshots used to filter stale revisions before LIMIT. */
  specialDateConfigs?: readonly {
    id: string;
    revision: number;
  }[];
  staleBefore?: Date;
};

export type UpdateCrmScheduledMessageInput = {
  cancelledAt?: Date | null;
  content?: string;
  dueAt?: Date;
  errorMessage?: string | null;
  expectedStatus?: CrmScheduledMessageStatus;
  expectedStatuses?: readonly CrmScheduledMessageStatus[];
  /** Durable scheduler-owner fence, paired with expectedUpdatedAt. */
  expectedClaimToken?: string;
  expectedUpdatedAt?: Date;
  id: string;
  metadata?: Record<string, unknown>;
  /** Wall clock used when stale sending leases are claimed. */
  now?: Date;
  scheduledAt?: Date;
  sentAt?: Date | null;
  sentMessageId?: string | null;
  staleBefore?: Date;
  status: CrmScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt?: Date;
};
