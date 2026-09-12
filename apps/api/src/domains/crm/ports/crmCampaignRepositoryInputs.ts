import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmCampaignRecipientStatus,
  CrmCampaignStatus,
} from "./crmConversationRepositoryModels.js";

export type CreateCrmCampaignInput = {
  content: string;
  createdByUserId?: UserId | null;
  initialStageId?: string | null;
  intervalMinutes: number;
  mediaType?: string | null;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown>;
  name: string;
  repliedCount?: number;
  replyStageId?: string | null;
  scheduledCount: number;
  scheduledEndAt: Date;
  scheduledStartAt: Date;
  secondaryContent?: string | null;
  secondaryDelayMinutes?: number;
  secondarySentCount?: number;
  selectedConnectionId?: string | null;
  sentCount?: number;
  status: CrmCampaignStatus;
  storeId: StoreId;
  tenantId: TenantId;
  totalRecipients: number;
};

export type CreateCrmCampaignRecipientInput = {
  campaignId: string;
  connectionId: string;
  initialScheduledMessageId?: string | null;
  leadId?: string | null;
  recipientAddress: string;
  sequence: number;
  cycleId: string;
  status?: CrmCampaignRecipientStatus;
  storeId: StoreId;
  tenantId: TenantId;
  variables?: Record<string, unknown>;
};

export type FindCrmCampaignInput = {
  campaignId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type IncrementCrmCampaignCountsInput = FindCrmCampaignInput & {
  failedDelta?: number;
  repliedDelta?: number;
  scheduledDelta?: number;
  secondarySentDelta?: number;
  sentDelta?: number;
};

/**
 * Records a provider result and its campaign metric in one repository
 * operation. `campaignRecipientKey` is the stable conversation-cycle id that
 * was copied to the scheduled message; sequence remains part of the identity
 * so a malformed or stale cycle key cannot select another delivery.
 */
export type RecordCrmCampaignDeliveryInput = FindCrmCampaignInput & {
  campaignMessageType?: string | null;
  campaignRecipientKey?: string | null;
  campaignSequence: number;
  errorMessage?: string;
  sentAt?: Date;
  sentMessageId?: string | null;
};

/** Claims one inbound campaign reply and its reply metric atomically. */
export type ClaimCrmCampaignReplyInput = FindCrmCampaignInput & {
  recipientId: string;
  replyContentPreview: string | null;
  replyMessageId: string;
  replyReceivedAt: Date;
  secondarySchedule?: {
    campaignRecipientKey: string;
    campaignSequence: number;
    connectionId: string;
    content: string;
    createdByUserId?: UserId | null;
    cycleId: string;
    metadata?: Record<string, unknown>;
    recipientAddress: string;
    scheduledAt: Date;
  };
};

export type ListCrmCampaignRecipientsInput = {
  campaignId?: string;
  campaignSequence?: number;
  connectionId?: string;
  limit: number;
  recipientAddress?: string;
  cycleId?: string;
  statuses?: readonly CrmCampaignRecipientStatus[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type ListCrmCampaignsInput = {
  limit: number;
  status?: CrmCampaignStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmCampaignInput = FindCrmCampaignInput & {
  failedCount?: number;
  metadata?: Record<string, unknown>;
  repliedCount?: number;
  scheduledCount?: number;
  secondarySentCount?: number;
  sentCount?: number;
  status?: CrmCampaignStatus;
};

export type UpdateCrmCampaignRecipientInput = {
  errorMessage?: string | null;
  expectedStatus?: CrmCampaignRecipientStatus;
  initialScheduledMessageId?: string | null;
  initialSentAt?: Date | null;
  recipientId: string;
  replyContentPreview?: string | null;
  replyMessageId?: string | null;
  replyReceivedAt?: Date | null;
  secondaryScheduledMessageId?: string | null;
  secondarySentAt?: Date | null;
  sentMessageId?: string | null;
  status?: CrmCampaignRecipientStatus;
  storeId: StoreId;
  tenantId: TenantId;
};
