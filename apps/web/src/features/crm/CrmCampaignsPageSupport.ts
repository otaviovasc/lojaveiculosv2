import { formatCycleName } from "./crmConversationModel";
import type { CampaignRecipientReviewRow } from "./CrmCampaignRecipientReview";
import type {
  CrmCampaign,
  CrmCampaignDetail,
  CrmCreateCampaignInput,
} from "./crmCampaignTypes";
import type { ProductCrmApi } from "./productCrmApi";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmConversationCycle } from "./crmConversationTypes";

export type CrmCampaignsPageProps = {
  canCancel: boolean;
  canCreate: boolean;
  canRead: boolean;
  initialCampaigns?: CrmCampaign[];
  onCancelCampaign: (campaignId: string) => Promise<CrmCampaign | null>;
  onCreateCampaign: (
    input: CrmCreateCampaignInput,
  ) => Promise<CrmCampaign | null>;
  onGetCampaign: (campaignId: string) => Promise<CrmCampaignDetail>;
  onListCampaigns: () => Promise<CrmCampaign[]>;
  onListLeads?: ProductCrmApi["listLeads"];
  onListRecipientSessions?: CrmConversationApi["listConversationCycles"];
  onPauseCampaign: (campaignId: string) => Promise<CrmCampaign | null>;
  onResumeCampaign: (campaignId: string) => Promise<CrmCampaign | null>;
  conversationCycles: CrmConversationCycle[];
  stageOptions: CrmCampaignStageOption[];
};

export type CrmCampaignStageOption = {
  color?: string;
  label: string;
  value: string;
};

export function matchesCampaignFilters(
  cycle: CrmConversationCycle,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return (
    !normalizedQuery ||
    formatCycleName(cycle).toLowerCase().includes(normalizedQuery) ||
    (cycle.customerPhone ?? "").includes(normalizedQuery)
  );
}

export function buildCampaignInput(input: {
  campaignName: string;
  firstDate: Date;
  initialStageId: string;
  intervalMinutes: number;
  replyStageId: string;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  text: string;
  validRecipients: CampaignRecipientReviewRow[];
}): CrmCreateCampaignInput {
  return {
    content: input.text,
    ...(input.initialStageId !== "none"
      ? { initialStageId: input.initialStageId }
      : {}),
    intervalMinutes: input.intervalMinutes,
    name: input.campaignName.trim(),
    recipients: input.validRecipients.map((row) => ({
      cycleId: String(row.cycleId),
      variables: { nome: row.name.trim() || "cliente" },
    })),
    ...(input.replyStageId !== "none"
      ? { replyStageId: input.replyStageId }
      : {}),
    scheduledStartAt: input.firstDate.toISOString(),
    ...(input.secondaryContent.trim()
      ? {
          secondaryContent: input.secondaryContent.trim(),
          secondaryDelayMinutes: input.secondaryDelayMinutes,
        }
      : {}),
  };
}

export async function mutateCampaign(
  action: (campaignId: string) => Promise<CrmCampaign | null>,
  campaignId: string,
  reload: () => Promise<void>,
  onError?: (error: unknown) => void,
) {
  try {
    const result = await action(campaignId);
    if (result) await reload();
  } catch (error) {
    onError?.(error);
  }
}
