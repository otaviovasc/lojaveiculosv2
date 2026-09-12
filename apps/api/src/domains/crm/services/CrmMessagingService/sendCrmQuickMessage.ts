import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { sendOutboundMessage } from "../../messaging/sendOutboundMessage.js";
import { assertCrmAudioIsNormalized } from "../../messaging/crmAudioNormalization.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  findQuickMessage,
  quickMessageAuditInput,
  requireQuickMediaUrl,
} from "./crmQuickMessageServiceSupport.js";

const permission = "crm.messages.send";

export type SendCrmQuickMessageInput = {
  idempotencyKey?: string;
  quickMessageId: string;
  cycleId: string;
};

export async function sendCrmQuickMessage(
  context: ServiceContext,
  input: SendCrmQuickMessageInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.quick_message.send.started", {
    quickMessageId: input.quickMessageId,
    cycleId: input.cycleId,
  });
  const quick = await findQuickMessage(context, input.quickMessageId, ports);
  return recordCrmServiceMutation(
    context,
    quickMessageAuditInput(
      "crm.quick_message.send",
      quick.id,
      permission,
      input.cycleId,
    ),
    () =>
      sendOutboundMessage(
        context,
        {
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          idempotencyPayload: input,
          senderOrigin: "human_crm",
          prepare: async ({ connection, gateway, phone }) => {
            if (quick.kind === "AUDIO") {
              assertCrmAudioIsNormalized(quick.mediaType);
            }
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
                    ...(quick.mediaType ? { mimeType: quick.mediaType } : {}),
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
                sentByActorId: context.actor.id,
              },
              sent,
              type: quick.kind,
            };
          },
          cycleId: input.cycleId,
        },
        ports,
      ),
  );
}
