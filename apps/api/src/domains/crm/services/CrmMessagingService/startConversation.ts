import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type {
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
} from "../../ports/crmConversationRepository.js";
import type { CrmWhatsappSendTemplateInput } from "../../ports/crmMessagingGatewayTypes.js";
import type {
  CrmMessage,
  CrmConversationCycle,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmMessagingGateway,
  isCrmOlxChatEnabled,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  markStartedConversationMessageFailed,
  publishConversation,
} from "../../messaging/startConversationSupport.js";
import { resolveStartConversationTarget } from "../../messaging/startConversationTarget.js";
import { channelForCrmProvider } from "../../messaging/crmMessagingProvider.js";
import {
  assertConversationStartMode,
  conversationContent,
  conversationMessageType,
} from "../../messaging/startConversationMode.js";
import {
  completeDurableOutboundProviderCall,
  executeDurableOutboundProviderCall,
} from "../../messaging/executeDurableOutboundProviderCall.js";
import { notifyHumanOutboundAttendanceStarted } from "../../messaging/outboundAttendance.js";
import { completeStartedConversation } from "../../messaging/completeStartedConversation.js";
import { assertProviderEffectAllowed } from "../../messaging/assertProviderEffectAllowed.js";
import { prepareStartedConversation } from "../../messaging/prepareStartedConversation.js";
import { resolveCrmProviderOperation } from "../CrmRoutingService/resolveCrmProviderOperation.js";
import {
  fingerprintOutboundIntent,
  resolveOutboundClientRequestId,
} from "../../messaging/outboundMessageSupport.js";

const permission = "crm.messages.send";
type SentWhatsappText = Awaited<
  ReturnType<ReturnType<typeof getCrmMessagingGateway>["sendText"]>
>;
export type StartConversationInput = {
  channel?: "instagram" | "olx_chat" | "whatsapp";
  customerDisplayName?: string;
  connectionId?: string;
  idempotencyKey?: string;
  leadId?: string;
  phone?: string;
  senderOrigin?: CrmMessageSenderOrigin;
  senderType?: CrmMessageSenderType;
  template?: Omit<CrmWhatsappSendTemplateInput, "phone">;
  text?: string;
};

export type StartConversationResult = {
  lead: CrmLead;
  message: CrmMessage;
  conversationCycle: CrmConversationCycle;
};

export async function startConversation(
  context: ServiceContext,
  input: StartConversationInput,
  ports: CrmServicePorts,
): Promise<StartConversationResult> {
  assertPermission(context, permission);
  const scope = requireCrmMessagingScope(context);
  const connection = await resolveCrmProviderOperation({
    channel: input.channel ?? "whatsapp",
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    ports,
    requiredCapabilities: input.template
      ? ["conversation_start", "outbound", "templates"]
      : ["conversation_start", "outbound", "text"],
    scope,
  });
  assertProviderEffectAllowed(context, connection, {
    olxChatEnabled: isCrmOlxChatEnabled(ports),
  });
  assertConversationStartMode(connection, input);
  const target = await resolveStartConversationTarget(context, input, ports);
  const channel = channelForCrmProvider(connection.channel);
  const content = conversationContent(input);
  const senderOrigin = input.senderOrigin ?? "human_crm";
  const senderType = input.senderType ?? "HUMAN";
  const clientRequestId = resolveOutboundClientRequestId(
    context,
    input.idempotencyKey,
    fingerprintOutboundIntent({ payload: input, senderOrigin, senderType }),
  );
  logCrmServiceEvent(context, "crm.conversation.start.started", {
    connectionId: connection.id,
    leadId: target.lead?.id ?? null,
    phoneLength: target.phone.length,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.conversation.start",
      category: "data_change",
      entityId: connection.id,
      entityType: "crm_whatsapp_connection",
      metadata: {
        ...(input.template ? { templateName: input.template.name } : {}),
        textLength: input.text?.length ?? 0,
      },
      permission,
      summary: "Started CRM WhatsApp conversation",
    },
    async () => {
      const pending = await prepareStartedConversation({
        channel,
        connection,
        content,
        context,
        idempotencyKey: clientRequestId,
        messageType: conversationMessageType(input),
        ports,
        scope,
        senderOrigin,
        senderType,
        target,
      });

      const gateway = getCrmMessagingGateway(ports);
      const effect = await executeDurableOutboundProviderCall(
        context,
        {
          connectionId: connection.id,
          idempotencyKey: clientRequestId,
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
          cycleId: pending.ingested.conversationCycle.id,
        },
        ports,
      ).catch(async (error) => {
        await markStartedConversationMessageFailed(context, ports, {
          connectionProvider: connection.provider,
          error,
          messageId: pending.ingested.message.id,
          pendingExternalId: pending.pendingExternalId,
          clientRequestId,
          senderOrigin,
          senderType,
        });
        throw error;
      });
      const sent: SentWhatsappText = effect.sent;

      const result = await completeStartedConversation(
        context,
        {
          content,
          createdMessage: pending.ingested.createdMessage,
          assignment: pending.assignment,
          interventionId: effect.intent.id,
          lead: pending.lead,
          messageId: pending.ingested.message.id,
          pendingExternalId: pending.pendingExternalId,
          clientRequestId,
          provider: connection.provider,
          providerExternalId: sent.externalId,
          providerTimestamp: sent.providerTimestamp,
          senderOrigin,
          senderType,
          cycleId: pending.ingested.conversationCycle.id,
        },
        ports,
      );

      const message = result.message;
      await completeDurableOutboundProviderCall(ports, {
        claimToken: effect.intent.claimToken,
        id: effect.intent.id,
        messageId: String(result.message.id),
        cycleId: String(result.conversationCycle.id),
      });
      const conversationCycle = result.conversationCycle;
      await publishConversation(ports, {
        connectionId: connection.id,
        message,
        conversationCycle,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      await notifyHumanOutboundAttendanceStarted(
        context,
        {
          changed: result.attendanceChanged,
          connection,
          providerTimestamp: sent.providerTimestamp,
          conversationCycle: result.conversationCycle,
        },
        ports,
      );
      return { lead: result.lead, message, conversationCycle };
    },
  );
}
