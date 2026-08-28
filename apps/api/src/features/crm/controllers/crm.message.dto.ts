import type { CrmMessageDto } from "@lojaveiculosv2/shared";
import type { CrmMessage } from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import { toCrmChannelDto } from "./crm.channel.dto.js";
import { readHumanCrmMessageSenderUser } from "../../../domains/crm/messaging/crmMessageSender.js";
import { readOutboundClientRequestId } from "../../../domains/crm/messaging/outboundMessageSupport.js";

function toIsoString(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function toCrmMessageDto(message: CrmMessage): CrmMessageDto {
  const senderUser = readHumanCrmMessageSenderUser(message);
  const clientRequestId = readOutboundClientRequestId(message);
  return {
    channel: toCrmChannelDto(message.channel),
    ...(clientRequestId ? { clientRequestId } : {}),
    content: message.content,
    createdAt: toIsoString(message.createdAt)!,
    deletedAt: toIsoString(message.deletedAt),
    direction: message.direction,
    externalId: message.externalId,
    id: message.id,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    metadata: message.metadata,
    providerTimestamp: toIsoString(message.providerTimestamp),
    senderOrigin: message.senderOrigin,
    senderType: message.senderType,
    ...(senderUser ? { senderUser } : {}),
    status: message.status,
    type: message.type,
  };
}
