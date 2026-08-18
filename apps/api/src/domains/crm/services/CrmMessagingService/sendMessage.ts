import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { sendOutboundMessage } from "../../messaging/sendOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
export {
  CrmMessageActionError,
  CrmMessageDtoNotFoundError,
  ConversationCycleNotFoundError,
} from "../../messaging/crmMessagingErrors.js";
import {
  CrmMessageActionError,
  CrmMessageDtoNotFoundError,
} from "../../messaging/crmMessagingErrors.js";
import type {
  CrmMessage,
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
} from "../../ports/crmConversationRepository.js";

const permission = "crm.messages.send";

export type SendCrmTextMessageInput = {
  idempotencyKey?: string;
  replyToMessageId?: string;
  senderOrigin?: CrmMessageSenderOrigin;
  senderType?: CrmMessageSenderType;
  cycleId: string;
  text: string;
};

export async function sendMessage(
  context: ServiceContext,
  input: SendCrmTextMessageInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.message.send_text.started", {
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.message.send_text",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { textLength: input.text.length },
      permission,
      summary: "Sent CRM WhatsApp text message",
    },
    () =>
      sendOutboundMessage(
        context,
        {
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          idempotencyPayload: {
            replyToMessageId: input.replyToMessageId ?? null,
            cycleId: input.cycleId,
            text: input.text,
          },
          prepare: async ({ connection, gateway, phone }) => {
            const replyTo = input.replyToMessageId
              ? await resolveReplyTarget(context, {
                  messageId: input.replyToMessageId,
                  ports,
                  cycleId: input.cycleId,
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
                ...(replyTo ? { replyTo: replyMetadata(replyTo) } : {}),
                sentByActorId: context.actor.id,
              },
              sent,
              type: "TEXT",
            };
          },
          ...(input.senderType ? { senderType: input.senderType } : {}),
          senderOrigin: input.senderOrigin ?? "human_crm",
          cycleId: input.cycleId,
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
    cycleId: string;
  },
) {
  const scope = requireCrmMessagingScope(context);
  const message = await getCrmConversationRepository(
    input.ports,
  ).findMessageById({
    messageId: input.messageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!message) throw new CrmMessageDtoNotFoundError(input.messageId);
  if (message.cycleId !== input.cycleId) {
    throw new CrmMessageActionError(
      "Reply target does not belong to this CRM WhatsApp conversationCycle.",
    );
  }
  if (!message.externalId) {
    throw new CrmMessageActionError(
      "Reply target is not available in the WhatsApp provider yet.",
      409,
    );
  }
  return message;
}

function replyMetadata(message: CrmMessage) {
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
