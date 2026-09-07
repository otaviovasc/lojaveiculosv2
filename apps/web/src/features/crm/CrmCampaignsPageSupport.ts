import { formatCycleName } from "./crmConversationModel";
import type { CampaignRecipientReviewRow } from "./CrmCampaignRecipientReview";
import type {
  CrmCampaign,
  CrmCampaignDetail,
  CrmCreateCampaignInput,
} from "./crmCampaignTypes";
import type { ProductCrmApi } from "./productCrmApi";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmConversationCycle, CrmTag } from "./crmConversationTypes";

export type CrmCampaignsPageProps = {
  campaignConnectionKey?: string | number | null;
  canCancel: boolean;
  canCreate: boolean;
  canRead: boolean;
  canUseImage?: boolean;
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
  tags: CrmTag[];
};

export function matchesCampaignFilters(
  cycle: CrmConversationCycle,
  query: string,
  selectedTagId: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    formatCycleName(cycle).toLowerCase().includes(normalizedQuery) ||
    (cycle.customerPhone ?? "").includes(normalizedQuery);
  const matchesTag =
    selectedTagId === "all" ||
    cycle.tags?.some((tag) => tag.id === selectedTagId);
  return matchesQuery && matchesTag;
}

export function buildCampaignInput(input: {
  campaignName: string;
  firstDate: Date;
  initialTagId: string;
  intervalMinutes: number;
  mediaBase64?: string | null;
  mediaFileName?: string | null;
  mediaType?: string | null;
  replyTagId: string;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  text: string;
  validRecipients: CampaignRecipientReviewRow[];
}): CrmCreateCampaignInput {
  return {
    content: input.text,
    ...(input.initialTagId !== "none"
      ? { initialTagId: input.initialTagId }
      : {}),
    intervalMinutes: input.intervalMinutes,
    ...(input.mediaBase64
      ? {
          mediaBase64: input.mediaBase64,
          ...(input.mediaFileName
            ? { mediaFileName: input.mediaFileName }
            : {}),
          ...(input.mediaType ? { mediaType: input.mediaType } : {}),
        }
      : {}),
    name: input.campaignName.trim(),
    recipients: input.validRecipients.map((row) => ({
      cycleId: String(row.cycleId),
      variables: { nome: row.name.trim() || "cliente" },
    })),
    ...(input.replyTagId !== "none" ? { replyTagId: input.replyTagId } : {}),
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
