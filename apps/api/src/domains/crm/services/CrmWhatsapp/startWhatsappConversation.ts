import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type {
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
} from "../../ports/crmWhatsappRepository.js";
import type { CrmWhatsappSendTemplateInput } from "../../ports/crmWhatsappGateway.js";
import type {
  WhatsappMessage,
  WhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  isCrmOlxChatEnabled,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  markStartedConversationMessageFailed,
  publishConversation,
} from "../../whatsapp/startWhatsappConversationSupport.js";
import { resolveStartConversationTarget } from "../../whatsapp/startWhatsappConversationTarget.js";
import { channelForCrmProvider } from "../../messaging/crmMessagingProvider.js";
import {
  assertConversationStartMode,
  conversationContent,
  conversationMessageType,
} from "../../whatsapp/startWhatsappConversationMode.js";
import {
  completeDurableOutboundProviderCall,
  executeDurableOutboundProviderCall,
} from "../../whatsapp/executeDurableOutboundProviderCall.js";
import { notifyHumanOutboundAttendanceStarted } from "../../whatsapp/sendWhatsappOutboundAttendance.js";
import { completeStartedWhatsappConversation } from "../../whatsapp/completeStartedWhatsappConversation.js";
import { assertWhatsappProviderEffectAllowed } from "../../whatsapp/assertWhatsappProviderEffectAllowed.js";
import { prepareStartedWhatsappConversation } from "../../whatsapp/prepareStartedWhatsappConversation.js";

const permission = "crm.whatsapp.send";
type SentWhatsappText = Awaited<
  ReturnType<ReturnType<typeof getCrmWhatsappGateway>["sendText"]>
>;
export type StartWhatsappConversationInput = {
  buyerName?: string;
  connectionId: string;
  idempotencyKey?: string;
  leadId?: string;
  phone?: string;
  senderOrigin?: CrmWhatsappMessageSenderOrigin;
  senderType?: CrmWhatsappMessageSenderType;
  template?: Omit<CrmWhatsappSendTemplateInput, "phone">;
  text?: string;
};

export type StartWhatsappConversationResult = {
  lead: CrmLead;
  message: WhatsappMessage;
  session: WhatsappSession;
};

export async function startWhatsappConversation(
  context: ServiceContext,
  input: StartWhatsappConversationInput,
  ports: CrmServicePorts,
): Promise<StartWhatsappConversationResult> {
  assertPermission(context, permission);
  const scope = requireCrmWhatsappScope(context);
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(input.connectionId);
  }
  assertWhatsappProviderEffectAllowed(context, connection, {
    olxChatEnabled: isCrmOlxChatEnabled(ports),
  });
  assertConversationStartMode(connection.provider, input);
  const target = await resolveStartConversationTarget(context, input, ports);
  const channel = channelForCrmProvider(connection.provider);
  const content = conversationContent(input);
  const senderOrigin = input.senderOrigin ?? "human_crm";
  const senderType = input.senderType ?? "HUMAN";
  logWhatsappServiceEvent(context, "crm.whatsapp.conversation.start.started", {
    connectionId: input.connectionId,
    leadId: target.lead?.id ?? null,
    phoneLength: target.phone.length,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.conversation.start",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        ...(input.template ? { templateName: input.template.name } : {}),
        textLength: input.text?.length ?? 0,
      },
      permission,
      summary: "Started CRM WhatsApp conversation",
    },
    async () => {
      const pending = await prepareStartedWhatsappConversation({
        channel,
        connection,
        content,
        context,
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
        messageType: conversationMessageType(input),
        ports,
        scope,
        senderOrigin,
        senderType,
        target,
      });

      const gateway = getCrmWhatsappGateway(ports);
      const effect = await executeDurableOutboundProviderCall(
        context,
        {
          connectionId: connection.id,
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          payload: input,
          senderOrigin,
          senderType,
          send: () =>
            input.template
              ? gateway.sendTemplate(connection, {
                  ...input.template,
                  phone: target.phone,
                })
              : gateway.sendText(connection, {
                  phone: target.phone,
                  text: input.text!,
                }),
          sessionId: pending.ingested.session.id,
        },
        ports,
      ).catch(async (error) => {
        await markStartedConversationMessageFailed(context, ports, {
          connectionProvider: connection.provider,
          error,
          messageId: pending.ingested.message.id,
          pendingExternalId: pending.pendingExternalId,
        });
        throw error;
      });
      const sent: SentWhatsappText = effect.sent;

      const result = await completeStartedWhatsappConversation(
        context,
        {
          content,
          createdMessage: pending.ingested.createdMessage,
          assignment: pending.assignment,
          interventionId: effect.intent.id,
          lead: pending.lead,
          messageId: pending.ingested.message.id,
          pendingExternalId: pending.pendingExternalId,
          provider: connection.provider,
          providerExternalId: sent.externalId,
          providerTimestamp: sent.providerTimestamp,
          senderType,
          sessionId: pending.ingested.session.id,
        },
        ports,
      );

      const message = toWhatsappMessage(result.message);
      await completeDurableOutboundProviderCall(ports, {
        claimToken: effect.intent.claimToken,
        id: effect.intent.id,
        messageId: String(result.message.id),
        sessionId: String(result.session.id),
      });
      const session = toWhatsappSession(result.session, connection);
      await publishConversation(ports, {
        connectionId: connection.id,
        message,
        session,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      await notifyHumanOutboundAttendanceStarted(
        context,
        {
          changed: result.attendanceChanged,
          connection,
          providerTimestamp: sent.providerTimestamp,
          session: result.session,
        },
        ports,
      );
      return { lead: result.lead, message, session };
    },
  );
}
