import type { CrmConversationCycleId } from "./crmConversationTypes";

export type CrmCampaignStatus =
  "cancelled" | "completed" | "draft" | "paused" | "scheduled";

export type CrmCampaign = {
  content: string;
  createdAt: string;
  failedCount: number;
  id: string;
  initialStageId: string | null;
  intervalMinutes: number;
  mediaFileName?: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  name: string;
  repliedCount: number;
  replyRate: number;
  replyStageId: string | null;
  scheduledCount: number;
  scheduledEndAt: string;
  scheduledStartAt: string;
  secondaryContent: string | null;
  secondaryDelayMinutes: number;
  secondarySentCount: number;
  sentCount: number;
  status: CrmCampaignStatus;
  totalRecipients: number;
  updatedAt: string;
};

export type CrmCampaignRecipientStatus =
  | "cancelled"
  | "failed"
  | "pending"
  | "replied"
  | "secondary_scheduled"
  | "secondary_sent"
  | "sent";

export type CrmCampaignRecipient = {
  campaignId: string;
  connectionId: string;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  initialScheduledMessageId: string | null;
  initialSentAt: string | null;
  leadId: string | null;
  recipientAddress: string;
  replyContentPreview: string | null;
  replyMessageId: string | null;
  replyReceivedAt: string | null;
  secondaryScheduledMessageId: string | null;
  secondarySentAt: string | null;
  sentMessageId: string | null;
  sequence: number;
  cycleId: string;
  status: CrmCampaignRecipientStatus;
  updatedAt: string;
  variables: Record<string, unknown>;
};

export type CrmCampaignDetail = {
  campaign: CrmCampaign;
  recipients: CrmCampaignRecipient[];
};

export type CrmCreateCampaignInput = {
  content: string;
  initialStageId?: string | null;
  intervalMinutes?: number;
  mediaBase64?: string | null;
  mediaFileName?: string | null;
  mediaType?: string | null;
  name: string;
  recipients: Array<{
    cycleId: string;
    variables?: Record<string, string>;
  }>;
  replyStageId?: string | null;
  scheduledStartAt: string;
  secondaryContent?: string | null;
  secondaryDelayMinutes?: number;
};

export type CrmListCampaignsInput = {
  limit?: number;
  status?: CrmCampaignStatus;
};

export type CrmCampaignAction = (campaignId: string) => Promise<CrmCampaign>;

export type CrmCampaignRecipientDraft = {
  cycleId: CrmConversationCycleId;
  variables?: Record<string, string>;
};
