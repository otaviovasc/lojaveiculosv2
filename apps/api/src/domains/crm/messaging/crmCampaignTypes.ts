import type {
  CrmCampaign,
  CrmCampaignRecipient,
  CrmCampaignStatus,
} from "../ports/crmConversationRepository.js";

export const campaignReadPermission = "crm.campaigns.read";
export const campaignManagePermission = "crm.campaigns.manage";
export const campaignIngestPermission = "crm.conversations.manage";

export type CrmCampaignRecipientInput = {
  cycleId: string;
  variables?: Record<string, string>;
};

export type CreateCrmCampaignInput = {
  content: string;
  initialStageId?: string | null;
  intervalMinutes?: number;
  mediaBase64?: string | null;
  mediaFileName?: string | null;
  mediaType?: string | null;
  name: string;
  recipients: readonly CrmCampaignRecipientInput[];
  replyStageId?: string | null;
  scheduledStartAt: Date;
  secondaryContent?: string | null;
  secondaryDelayMinutes?: number;
};

export type ListCrmCampaignsInput = {
  limit?: number;
  status?: CrmCampaignStatus;
};

export type CrmCampaignIdInput = {
  campaignId: string;
};

export type CrmCampaignDetail = {
  campaign: CrmCampaign;
  recipients: readonly CrmCampaignRecipient[];
};

export type CrmCampaignResult = Promise<CrmCampaign>;

export type NormalizedCrmCampaignInput = {
  content: string;
  initialStageId: string | null;
  intervalMinutes: number;
  mediaFileName?: string | null;
  mediaStorageKey?: string | null;
  mediaType?: string | null;
  mediaUrl?: string | null;
  name: string;
  recipients: readonly CrmCampaignRecipientInput[];
  replyStageId: string | null;
  scheduledStartAt: Date;
  secondaryContent: string | null;
  secondaryDelayMinutes: number;
};
