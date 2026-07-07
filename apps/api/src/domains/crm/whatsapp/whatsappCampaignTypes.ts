import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignRecipient,
  CrmWhatsappCampaignStatus,
} from "../ports/crmWhatsappRepository.js";

export const campaignReadPermission = "crm.whatsapp.campaigns.read";
export const campaignManagePermission = "crm.whatsapp.campaigns.manage";
export const campaignIngestPermission = "crm.whatsapp.ingest";

export type WhatsappCampaignRecipientInput = {
  sessionId: string;
  variables?: Record<string, string>;
};

export type CreateWhatsappCampaignInput = {
  content: string;
  initialTagId?: string | null;
  intervalMinutes?: number;
  name: string;
  recipients: readonly WhatsappCampaignRecipientInput[];
  replyTagId?: string | null;
  scheduledStartAt: Date;
  secondaryContent?: string | null;
  secondaryDelayMinutes?: number;
};

export type ListWhatsappCampaignsInput = {
  limit?: number;
  status?: CrmWhatsappCampaignStatus;
};

export type WhatsappCampaignIdInput = {
  campaignId: string;
};

export type WhatsappCampaignDetail = {
  campaign: CrmWhatsappCampaign;
  recipients: readonly CrmWhatsappCampaignRecipient[];
};

export type WhatsappCampaignResult = Promise<CrmWhatsappCampaign>;

export type NormalizedWhatsappCampaignInput = {
  content: string;
  initialTagId: string | null;
  intervalMinutes: number;
  name: string;
  recipients: readonly WhatsappCampaignRecipientInput[];
  replyTagId: string | null;
  scheduledStartAt: Date;
  secondaryContent: string | null;
  secondaryDelayMinutes: number;
};
