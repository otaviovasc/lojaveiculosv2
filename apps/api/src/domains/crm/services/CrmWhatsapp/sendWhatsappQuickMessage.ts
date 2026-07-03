import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  findQuickMessage,
  quickMessageAuditInput,
  requireQuickMediaUrl,
} from "./whatsappQuickMessageServiceSupport.js";

const permission = "crm.whatsapp.send";

export type SendWhatsappQuickMessageInput = {
  quickMessageId: string;
  sessionId: string;
};

export async function sendWhatsappQuickMessage(
  context: ServiceContext,
  input: SendWhatsappQuickMessageInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.quick_message.send.started", {
    quickMessageId: input.quickMessageId,
    sessionId: input.sessionId,
  });
  const quick = await findQuickMessage(context, input.quickMessageId, ports);
  return recordWhatsappServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.whatsapp.quick_message.send",
      quick.id,
      permission,
      input.sessionId,
    ),
    () =>
      sendWhatsappOutboundMessage(
        context,
        {
          prepare: async ({ connection, gateway, phone }) => {
            const sent =
              quick.kind === "TEXT"
                ? await gateway.sendText(connection, {
                    phone,
                    text: quick.content,
                  })
                : await gateway.sendMedia(connection, {
                    ...(quick.kind === "IMAGE" && quick.content
                      ? { caption: quick.content }
                      : {}),
                    mediaType: quick.kind.toLowerCase() as "audio" | "image",
                    mediaUrl: requireQuickMediaUrl(quick),
                    phone,
                  });
            return {
              content: quick.content || quick.title,
              leadActivityContent: quick.title,
              ...(quick.mediaType ? { mediaType: quick.mediaType } : {}),
              ...(quick.mediaUrl ? { mediaUrl: quick.mediaUrl } : {}),
              metadata: {
                provider: connection.provider,
                quickMessageId: quick.id,
                raw: sent.raw,
                sentByActorId: context.actor.id,
              },
              sent,
              type: quick.kind,
            };
          },
          sessionId: input.sessionId,
        },
        ports,
      ),
  );
}
