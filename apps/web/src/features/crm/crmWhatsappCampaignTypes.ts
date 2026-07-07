import type { CrmWhatsappSessionId } from "./crmWhatsappTypes";

export type CrmWhatsappCampaignStatus =
  "cancelled" | "completed" | "draft" | "paused" | "scheduled";

export type CrmWhatsappCampaign = {
  content: string;
  createdAt: string;
  failedCount: number;
  id: string;
  initialTagId: string | null;
  intervalMinutes: number;
  name: string;
  repliedCount: number;
  replyRate: number;
  replyTagId: string | null;
  scheduledCount: number;
  scheduledEndAt: string;
  scheduledStartAt: string;
  secondaryContent: string | null;
  secondaryDelayMinutes: number;
  secondarySentCount: number;
  sentCount: number;
  status: CrmWhatsappCampaignStatus;
  totalRecipients: number;
  updatedAt: string;
};

export type CrmWhatsappCampaignRecipientStatus =
  | "cancelled"
  | "failed"
  | "pending"
  | "replied"
  | "secondary_scheduled"
  | "secondary_sent"
  | "sent";

export type CrmWhatsappCampaignRecipient = {
  campaignId: string;
  connectionId: string;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  initialScheduledMessageId: string | null;
  initialSentAt: string | null;
  leadId: string | null;
  phone: string;
  replyContentPreview: string | null;
  replyMessageId: string | null;
  replyReceivedAt: string | null;
  secondaryScheduledMessageId: string | null;
  secondarySentAt: string | null;
  sentMessageId: string | null;
  sequence: number;
  sessionId: string;
  status: CrmWhatsappCampaignRecipientStatus;
  updatedAt: string;
  variables: Record<string, unknown>;
};

export type CrmWhatsappCampaignDetail = {
  campaign: CrmWhatsappCampaign;
  recipients: CrmWhatsappCampaignRecipient[];
};

export type CrmWhatsappCreateCampaignInput = {
  content: string;
  initialTagId?: string | null;
  intervalMinutes?: number;
  name: string;
  recipients: Array<{
    sessionId: string;
    variables?: Record<string, string>;
  }>;
  replyTagId?: string | null;
  scheduledStartAt: string;
  secondaryContent?: string | null;
  secondaryDelayMinutes?: number;
};

export type CrmWhatsappListCampaignsInput = {
  limit?: number;
  status?: CrmWhatsappCampaignStatus;
};

export type CrmWhatsappCampaignAction = (
  campaignId: string,
) => Promise<CrmWhatsappCampaign>;

export type CrmWhatsappCampaignRecipientDraft = {
  sessionId: CrmWhatsappSessionId;
  variables?: Record<string, string>;
};
