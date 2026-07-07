import type {
  CrmWhatsappCampaign,
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import {
  WhatsappMessageActionError,
  WhatsappSessionNotFoundError,
  WhatsappTagNotFoundError,
} from "./whatsappSendErrors.js";
import type {
  NormalizedWhatsappCampaignInput,
  WhatsappCampaignRecipientInput,
} from "./whatsappCampaignTypes.js";

export function dedupeCampaignRecipients(
  recipients: readonly WhatsappCampaignRecipientInput[],
) {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    if (seen.has(recipient.sessionId)) return false;
    seen.add(recipient.sessionId);
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
  repository: CrmWhatsappRepository,
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
      throw new WhatsappTagNotFoundError(tagId);
    }
  }
}

export async function resolveCampaignSessions(
  repository: CrmWhatsappRepository,
  scope: { storeId: string; tenantId: string },
  recipients: readonly WhatsappCampaignRecipientInput[],
) {
  const sessions: CrmWhatsappSession[] = [];
  for (const recipient of recipients) {
    const [session] = await repository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: recipient.sessionId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!session) throw new WhatsappSessionNotFoundError(recipient.sessionId);
    sessions.push(session);
  }
  return sessions;
}

export function singleCampaignConnectionId(
  sessions: readonly CrmWhatsappSession[],
) {
  const ids = new Set(sessions.map((session) => session.connectionId));
  return ids.size === 1 ? (sessions[0]?.connectionId ?? null) : null;
}

export function campaignScheduledAt(
  input: Pick<
    NormalizedWhatsappCampaignInput,
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
    NormalizedWhatsappCampaignInput,
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
  repository: CrmWhatsappRepository,
  campaign: CrmWhatsappCampaign,
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
  if (!name) throw new WhatsappMessageActionError("Campaign name is required.");
  if (!content) {
    throw new WhatsappMessageActionError("Campaign content is required.");
  }
}
