import { createHash } from "node:crypto";
import type { CrmPushDeliveryRequest } from "../ports/crmPushDeliveryProvider.js";
import type { CrmPushRecipientCandidate } from "../ports/crmPushRepository.js";

const mediaLabels: Readonly<Record<string, string>> = {
  audio: "Audio",
  contact: "Contato",
  document: "Documento",
  image: "Imagem",
  location: "Localizacao",
  sticker: "Figurinha",
  video: "Video",
};

export type BuildCrmPushPayloadInput = {
  buyerName: string | null;
  connectionId: string;
  content: string | null;
  cycleId: string;
  iconUrl: string;
  idempotencyKey: string;
  messageType: string;
  storeSlug: string;
  subscriptionIds: readonly string[];
  traceId: string;
  webUrl: string;
};

export type CrmPushRecipients = {
  subscriptionIds: readonly string[];
  userIds: readonly string[];
};

export function buildCrmPushPayload(
  input: BuildCrmPushPayloadInput,
): CrmPushDeliveryRequest {
  const buyerName = input.buyerName?.trim();
  return {
    body: buildCrmPushPreview(input.content, input.messageType),
    data: {
      connectionId: input.connectionId,
      cycleId: input.cycleId,
      pushTraceId: input.traceId,
      slug: input.storeSlug,
    },
    heading: buyerName || "cliente",
    iconUrl: input.iconUrl,
    idempotencyKey: input.idempotencyKey,
    subscriptionIds: uniqueSorted(input.subscriptionIds),
    topic: crmPushTopic(input.cycleId),
    ttlSeconds: 86_400,
    webUrl: input.webUrl,
  };
}

export function buildCrmPushPreview(
  content: string | null,
  messageType: string,
): string {
  const text = content?.trim();
  if (text) return text.slice(0, 100);
  return mediaLabels[messageType.toLowerCase()] ?? "Nova mensagem";
}

export function crmPushTopic(cycleId: string): string {
  const hash = createHash("sha256").update(cycleId).digest("hex").slice(0, 16);
  return `crm-${hash}`;
}

export function buildCrmPushIntentIdempotencyKey(input: {
  cycleId: string;
  messageId: string;
  storeId: string;
  tenantId: string;
}): string {
  const hex = createHash("sha256")
    .update(
      `${input.tenantId}:${input.storeId}:${input.cycleId}:${input.messageId}`,
    )
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function resolveCrmPushRecipients(input: {
  assignedUserId: string | null;
  candidates: readonly CrmPushRecipientCandidate[];
}): CrmPushRecipients {
  const eligibleCandidates = input.candidates.filter((candidate) => {
    if (
      !candidate.activeMembership ||
      !candidate.canReadConversations ||
      !candidate.preferenceEnabled
    ) {
      return false;
    }
    if (input.assignedUserId) return candidate.userId === input.assignedUserId;
    return candidate.hasGlobalQueueVisibility;
  });
  return {
    subscriptionIds: uniqueSorted(
      eligibleCandidates.flatMap((candidate) => candidate.subscriptionIds),
    ),
    userIds: uniqueSorted(
      eligibleCandidates
        .filter((candidate) => candidate.subscriptionIds.length > 0)
        .map((candidate) => candidate.userId),
    ),
  };
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
