import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  getCrmWhatsappRepository,
  requireCrmScope,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
export {
  WhatsappConnectionNotFoundError,
  WhatsappMessageActionError,
  WhatsappMessageNotFoundError,
  WhatsappSessionNotFoundError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  WhatsappMessageActionError,
  WhatsappMessageNotFoundError,
} from "../../whatsapp/whatsappSendErrors.js";
import type { CrmWhatsappMessage } from "../../ports/crmWhatsappRepository.js";

const permission = "crm.whatsapp.send";

export type SendWhatsappTextInput = {
  replyToMessageId?: string;
  sessionId: string;
  text: string;
};

export async function sendWhatsappText(
  context: ServiceContext,
  input: SendWhatsappTextInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.message.send_text.started", {
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.message.send_text",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { textLength: input.text.length },
      permission,
      summary: "Sent CRM WhatsApp text message",
    },
    () =>
      sendWhatsappOutboundMessage(
        context,
        {
          prepare: async ({ connection, gateway, phone }) => {
            const replyTo = input.replyToMessageId
              ? await resolveReplyTarget(context, {
                  messageId: input.replyToMessageId,
                  ports,
                  sessionId: input.sessionId,
                })
              : null;
            const sent = await gateway.sendText(connection, {
              phone,
              ...(replyTo?.externalId
                ? { replyToMessageId: replyTo.externalId }
                : {}),
              text: input.text,
            });
            return {
              content: input.text,
              metadata: {
                provider: connection.provider,
                raw: sent.raw,
                ...(replyTo ? { replyTo: replyMetadata(replyTo) } : {}),
                sentByActorId: context.actor.id,
              },
              sent,
              type: "TEXT",
            };
          },
          sessionId: input.sessionId,
        },
        ports,
      ),
  );
}

async function resolveReplyTarget(
  context: ServiceContext,
  input: {
    messageId: string;
    ports: CrmServicePorts;
    sessionId: string;
  },
) {
  const scope = requireCrmScope(context);
  const message = await getCrmWhatsappRepository(input.ports).findMessageById({
    messageId: input.messageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) throw new WhatsappMessageNotFoundError(input.messageId);
  if (message.sessionId !== input.sessionId) {
    throw new WhatsappMessageActionError(
      "Reply target does not belong to this CRM WhatsApp session.",
    );
  }
  if (!message.externalId) {
    throw new WhatsappMessageActionError(
      "Reply target is not available in the WhatsApp provider yet.",
      409,
    );
  }
  return message;
}

function replyMetadata(message: CrmWhatsappMessage) {
  return {
    content: truncate(message.content, 280),
    direction: message.direction,
    externalId: message.externalId,
    id: message.id,
    senderType: message.senderType,
    type: message.type,
  };
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
