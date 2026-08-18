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
  campaignId?: string;
  connectionId?: string;
  limit: number;
  scheduledMessageId?: string;
  cycleId?: string;
  status?: CrmScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindDueCrmScheduledMessagesInput = {
  dueAt: Date;
  limit: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindDueCrmScheduledMessageScopesInput = {
  dueAt: Date;
  limit: number;
};

export type UpdateCrmScheduledMessageInput = {
  cancelledAt?: Date | null;
  errorMessage?: string | null;
  expectedStatus?: CrmScheduledMessageStatus;
  id: string;
  sentAt?: Date | null;
  sentMessageId?: string | null;
  status: CrmScheduledMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};
