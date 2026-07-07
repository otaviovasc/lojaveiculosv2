import { formatSessionName } from "./crmWhatsappModel";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignDetail,
  CrmWhatsappCreateCampaignInput,
} from "./crmWhatsappCampaignTypes";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";

export type CrmWhatsappCampaignsPageProps = {
  canCancel: boolean;
  canCreate: boolean;
  canRead: boolean;
  onCancelCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign | null>;
  onCreateCampaign: (
    input: CrmWhatsappCreateCampaignInput,
  ) => Promise<CrmWhatsappCampaign | null>;
  onGetCampaign: (campaignId: string) => Promise<CrmWhatsappCampaignDetail>;
  onListCampaigns: () => Promise<CrmWhatsappCampaign[]>;
  onPauseCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign | null>;
  onResumeCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign | null>;
  sessions: CrmWhatsappSession[];
  tags: CrmWhatsappTag[];
};

export function matchesCampaignFilters(
  session: CrmWhatsappSession,
  query: string,
  selectedTagId: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    formatSessionName(session).toLowerCase().includes(normalizedQuery) ||
    (session.buyerPhone ?? "").includes(normalizedQuery);
  const matchesTag =
    selectedTagId === "all" ||
    session.sessionTags?.some((tag) => tag.id === selectedTagId);
  return matchesQuery && matchesTag;
}

export function buildCampaignInput(input: {
  campaignName: string;
  firstDate: Date;
  initialTagId: string;
  intervalMinutes: number;
  replyTagId: string;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  selectedSessions: CrmWhatsappSession[];
  text: string;
}): CrmWhatsappCreateCampaignInput {
  return {
    content: input.text,
    ...(input.initialTagId !== "none"
      ? { initialTagId: input.initialTagId }
      : {}),
    intervalMinutes: input.intervalMinutes,
    name: input.campaignName.trim(),
    recipients: input.selectedSessions.map((session) => ({
      sessionId: String(session.id),
      variables: { nome: formatSessionName(session) },
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
  action: (campaignId: string) => Promise<CrmWhatsappCampaign | null>,
  campaignId: string,
  reload: () => Promise<void>,
) {
  const result = await action(campaignId);
  if (result) await reload();
}
