import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmWhatsappCampaignRecipientStatus,
  CrmWhatsappCampaignStatus,
} from "./crmWhatsappRepositoryModels.js";

export type CreateCrmWhatsappCampaignInput = {
  content: string;
  createdByUserId?: UserId | null;
  initialTagId?: string | null;
  intervalMinutes: number;
  mediaType?: string | null;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown>;
  name: string;
  repliedCount?: number;
  replyTagId?: string | null;
  scheduledCount: number;
  scheduledEndAt: Date;
  scheduledStartAt: Date;
  secondaryContent?: string | null;
  secondaryDelayMinutes?: number;
  secondarySentCount?: number;
  selectedConnectionId?: string | null;
  sentCount?: number;
  status: CrmWhatsappCampaignStatus;
  storeId: StoreId;
  tenantId: TenantId;
  totalRecipients: number;
};

export type CreateCrmWhatsappCampaignRecipientInput = {
  campaignId: string;
  connectionId: string;
  initialScheduledMessageId?: string | null;
  leadId?: string | null;
  phone: string;
  sequence: number;
  sessionId: string;
  status?: CrmWhatsappCampaignRecipientStatus;
  storeId: StoreId;
  tenantId: TenantId;
  variables?: Record<string, unknown>;
};

export type FindCrmWhatsappCampaignInput = {
  campaignId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ListCrmWhatsappCampaignRecipientsInput = {
  campaignId?: string;
  campaignSequence?: number;
  limit: number;
  sessionId?: string;
  statuses?: readonly CrmWhatsappCampaignRecipientStatus[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type ListCrmWhatsappCampaignsInput = {
  limit: number;
  status?: CrmWhatsappCampaignStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmWhatsappCampaignInput = FindCrmWhatsappCampaignInput & {
  failedCount?: number;
  metadata?: Record<string, unknown>;
  repliedCount?: number;
  scheduledCount?: number;
  secondarySentCount?: number;
  sentCount?: number;
  status?: CrmWhatsappCampaignStatus;
};

export type UpdateCrmWhatsappCampaignRecipientInput = {
  errorMessage?: string | null;
  initialScheduledMessageId?: string | null;
  initialSentAt?: Date | null;
  recipientId: string;
  replyContentPreview?: string | null;
  replyMessageId?: string | null;
  replyReceivedAt?: Date | null;
  secondaryScheduledMessageId?: string | null;
  secondarySentAt?: Date | null;
  sentMessageId?: string | null;
  status?: CrmWhatsappCampaignRecipientStatus;
  storeId: StoreId;
  tenantId: TenantId;
};
