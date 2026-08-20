import type { CrmMessageDto } from "@lojaveiculosv2/shared";
import type { CrmMessage } from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import { toCrmChannelDto } from "./crm.channel.dto.js";

export function toCrmMessageDto(message: CrmMessage): CrmMessageDto {
  return {
    channel: toCrmChannelDto(message.channel),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    deletedAt: message.deletedAt?.toISOString() ?? null,
    direction: message.direction,
    externalId: message.externalId,
    id: message.id,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    metadata: message.metadata,
    providerTimestamp: message.providerTimestamp?.toISOString() ?? null,
    senderOrigin: message.senderOrigin,
    senderType: message.senderType,
    status: message.status,
    type: message.type,
  };
}
