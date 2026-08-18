import type {
  CrmCampaign,
  CrmQueueVisibility,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import {
  CrmMessageActionError,
  ConversationCycleNotFoundError,
  CrmTagNotFoundError,
} from "./crmMessagingErrors.js";
import type {
  NormalizedCrmCampaignInput,
  CrmCampaignRecipientInput,
} from "./crmCampaignTypes.js";

export function dedupeCampaignRecipients(
  recipients: readonly CrmCampaignRecipientInput[],
) {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    if (seen.has(recipient.cycleId)) return false;
    seen.add(recipient.cycleId);
    return true;
  });
}

export function normalizePositiveInt(
  value: number | undefined,
  fallback: number,
) {
  return Number.isInteger(value) && value && value > 0 ? value : fallback;
}

export async function requireCampaignTags(
  repository: CrmConversationRepository,
  scope: { storeId: string; tenantId: string },
  tagIds: readonly (string | null)[],
) {
  const wanted = tagIds.filter((tagId): tagId is string => Boolean(tagId));
  if (!wanted.length) return;
  const tags = await repository.listTags({
    limit: 200,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  for (const tagId of wanted) {
    if (!tags.some((tag) => tag.id === tagId)) {
      throw new CrmTagNotFoundError(tagId);
    }
  }
}

export async function resolveCampaignSessions(
  repository: CrmConversationRepository,
  scope: { storeId: string; tenantId: string },
  recipients: readonly CrmCampaignRecipientInput[],
  queueVisibility: CrmQueueVisibility,
) {
  const conversationCycles: CrmConversationCycle[] = [];
  for (const recipient of recipients) {
    const [conversationCycle] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      queueVisibility,
      cycleId: recipient.cycleId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!conversationCycle)
      throw new ConversationCycleNotFoundError(recipient.cycleId);
    if (
      conversationCycle.channel !== "WHATSAPP" ||
      !conversationCycle.customerPhone
    ) {
      throw new CrmMessageActionError(
        "Campaign recipients must use a WhatsApp conversation with a valid phone.",
      );
    }
    conversationCycles.push(conversationCycle);
  }
  return conversationCycles;
}

export function singleCampaignConnectionId(
  conversationCycles: readonly CrmConversationCycle[],
) {
  const ids = new Set(
    conversationCycles.map(
      (conversationCycle) => conversationCycle.connectionId,
    ),
  );
  return ids.size === 1 ? (conversationCycles[0]?.connectionId ?? null) : null;
}

export function campaignScheduledAt(
  input: Pick<
    NormalizedCrmCampaignInput,
    "intervalMinutes" | "scheduledStartAt"
  >,
  sequence: number,
) {
  return new Date(
    input.scheduledStartAt.getTime() +
      sequence * input.intervalMinutes * 60_000,
  );
}

export function campaignScheduledEnd(
  input: Pick<
    NormalizedCrmCampaignInput,
    "intervalMinutes" | "scheduledStartAt"
  >,
  recipientCount: number,
) {
  return campaignScheduledAt(input, Math.max(0, recipientCount - 1));
}

export function renderCampaignText(
  text: string,
  variables: Record<string, unknown> | undefined,
) {
  return text.replace(
    /\{\{\s*([\w.-]+)\s*\}\}|\{\s*([\w.-]+)\s*\}/g,
    (_, a, b) => {
      const key = String(a ?? b);
      const value = variables?.[key];
      return typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    },
  );
}

export function truncateCampaignPreview(value: string, max = 280) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

export async function cancelPendingCampaignMessages(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
) {
  const pending = await repository.listScheduledMessages({
    campaignId: campaign.id,
    limit: 500,
    status: "pending",
    storeId: campaign.storeId,
    tenantId: campaign.tenantId,
  });
  await Promise.all(
    pending.map((message) =>
      repository.updateScheduledMessage({
        cancelledAt: new Date(),
        expectedStatus: "pending",
        id: message.id,
        status: "cancelled",
        storeId: campaign.storeId,
        tenantId: campaign.tenantId,
      }),
    ),
  );
}

export function assertValidCampaignText(name: string, content: string) {
  if (!name) throw new CrmMessageActionError("Campaign name is required.");
  if (!content) {
    throw new CrmMessageActionError("Campaign content is required.");
  }
}
