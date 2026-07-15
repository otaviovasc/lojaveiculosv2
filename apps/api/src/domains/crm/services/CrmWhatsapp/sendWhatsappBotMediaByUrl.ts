import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import { forwardWhatsappMessageToBot } from "../../whatsapp/whatsappBotWebhookForwarding.js";
import { findOrCreateWhatsappLead } from "../../whatsapp/whatsappLeadLinking.js";
import {
  getCrmWhatsappGateway,
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  assertBotMediaTargetIsAvailable,
  resolveBotMediaTarget,
} from "../../whatsapp/whatsappBotMediaByUrlTarget.js";
import {
  contentForMedia,
  leadActivityContent,
  messageTypeForMedia,
  publishBotMediaResult,
  recordBotMediaLeadActivity,
} from "../../whatsapp/whatsappBotMediaByUrlResult.js";
import type { SendWhatsappBotMediaByUrlInput } from "../../whatsapp/whatsappBotMediaByUrlTypes.js";

const permission = "crm.whatsapp.send";

export async function sendWhatsappBotMediaByUrl(
  context: ServiceContext,
  input: SendWhatsappBotMediaByUrlInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  const target = await resolveBotMediaTarget(context, input, ports);
  assertBotMediaTargetIsAvailable(target.session);
  logWhatsappServiceEvent(context, "crm.whatsapp.bot.message.send_media_url", {
    connectionId: target.connection.id,
    mediaType: input.mediaType,
    sessionId: target.session?.id ?? null,
  });

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.bot.message.send_media_url",
      category: "data_change",
      entityId: target.session?.id ?? target.connection.id,
      entityType: target.session
        ? "crm_whatsapp_session"
        : "crm_whatsapp_connection",
      metadata: { mediaType: input.mediaType, source: "remote_url" },
      permission,
      summary: "Sent CRM WhatsApp bot media from remote URL",
    },
    async () => {
      const sent = await getCrmWhatsappGateway(ports).sendMedia(
        target.connection,
        {
          ...(input.mediaType === "audio" ? { asyncProcessing: true } : {}),
          ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
          ...(input.fileName?.trim()
            ? { fileName: input.fileName.trim() }
            : {}),
          mediaType: input.mediaType,
          mediaUrl: input.mediaUrl,
          ...(input.mimeType?.trim()
            ? { mimeType: input.mimeType.trim() }
            : {}),
          phone: target.phone,
        },
      );
      const scope = requireCrmWhatsappScope(context);
      const leadId =
        target.session?.leadId ??
        (
          await findOrCreateWhatsappLead(ports, {
            buyerName: target.buyerName ?? null,
            buyerPhone: target.phone,
            connectionId: target.connection.id,
            direction: "OUTBOUND",
            externalId: sent.externalId,
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          })
        ).id;
      const result = await getCrmWhatsappRepository(ports).ingestMessage({
        ...(target.buyerName ? { buyerName: target.buyerName } : {}),
        buyerPhone: target.phone,
        channel: "WHATSAPP",
        connectionId: target.connection.id,
        content: contentForMedia(input),
        direction: "OUTBOUND",
        externalId: sent.externalId,
        leadId,
        mediaType: input.mediaType,
        mediaUrl: input.mediaUrl,
        metadata: {
          media: {
            ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
            ...(input.fileName?.trim()
              ? { fileName: input.fileName.trim() }
              : {}),
            ...(input.mimeType?.trim()
              ? { mimeType: input.mimeType.trim() }
              : {}),
            source: "remote_url",
          },
          provider: target.connection.provider,
          raw: sent.raw,
          sentByActorId: context.actor.id,
          sentByBot: true,
          sentByCrm: true,
        },
        providerTimestamp: sent.providerTimestamp,
        senderType: "AI",
        status: "SENT",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        type: messageTypeForMedia(input.mediaType),
      });

      await recordBotMediaLeadActivity(context, ports, {
        content: leadActivityContent(input),
        leadId,
        messageExternalId: sent.externalId,
        occurredAt: sent.providerTimestamp,
        provider: target.connection.provider,
        raw: sent.raw,
        sessionId: result.session.id,
      });
      const message = toWhatsappMessage(result.message);
      const realtimeSession = toWhatsappSession(
        result.session,
        target.connection,
      );
      await publishBotMediaResult(context, ports, target.connection, {
        message,
        session: realtimeSession,
      });
      await forwardWhatsappMessageToBot(
        context,
        {
          connection: target.connection,
          message: result.message,
          session: result.session,
        },
        ports,
      );
      return message;
    },
  );
}
