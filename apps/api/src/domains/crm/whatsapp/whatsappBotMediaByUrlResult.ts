import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappMessageType } from "../ports/crmWhatsappRepository.js";
import type { toWhatsappSession, WhatsappMessage } from "./whatsappModels.js";
import {
  getCrmRealtimePublisher,
  getCrmRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { SendWhatsappBotMediaByUrlInput } from "./whatsappBotMediaByUrlTypes.js";

export async function publishBotMediaResult(
  context: ServiceContext,
  ports: CrmServicePorts,
  connection: CrmConnection,
  input: {
    message: WhatsappMessage;
    session: ReturnType<typeof toWhatsappSession>;
  },
) {
  const scope = requireCrmScope(context);
  const publisher = getCrmRealtimePublisher(ports);
  await publisher.publish({
    connectionId: connection.id,
    message: input.message,
    session: input.session,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    type: "message",
  });
  await publisher.publish({
    connectionId: connection.id,
    session: input.session,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    type: "session",
  });
}

export async function recordBotMediaLeadActivity(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    content: string;
    leadId: string;
    messageExternalId: string;
    occurredAt: Date;
    provider: string;
    raw: unknown;
    sessionId: string;
  },
) {
  const scope = requireCrmScope(context);
  await getCrmRepository(ports).createActivity({
    activityType: "whatsapp",
    content: input.content,
    direction: "outbound",
    leadId: input.leadId,
    metadata: {
      crmWhatsapp: {
        messageExternalId: input.messageExternalId,
        sessionId: input.sessionId,
      },
      provider: input.provider,
      raw: input.raw,
    },
    occurredAt: input.occurredAt,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export function messageTypeForMedia(
  mediaType: SendWhatsappBotMediaByUrlInput["mediaType"],
): CrmWhatsappMessageType {
  if (mediaType === "audio") return "AUDIO";
  if (mediaType === "document") return "DOCUMENT";
  return "IMAGE";
}

export function contentForMedia(input: SendWhatsappBotMediaByUrlInput) {
  const caption = input.caption?.trim();
  if (caption) return caption;
  if (input.mediaType === "document")
    return input.fileName?.trim() || "Documento";
  if (input.mediaType === "audio") return "[audio]";
  return "[image]";
}

export function leadActivityContent(input: SendWhatsappBotMediaByUrlInput) {
  if (input.mediaType === "document") {
    return `Documento: ${input.fileName?.trim() || input.mediaUrl}`;
  }
  if (input.mediaType === "audio") return "Audio";
  return input.caption?.trim() || "Imagem";
}
