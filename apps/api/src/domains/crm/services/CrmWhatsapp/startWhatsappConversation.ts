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
  getCrmWhatsappRepository,
  isCrmOlxChatEnabled,
  requireCrmWhatsappScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  createLocalWhatsappExternalId,
  findOrCreateLead,
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
import { fingerprintOutboundIntent } from "../../whatsapp/sendWhatsappOutboundSupport.js";
import { notifyHumanOutboundAttendanceStarted } from "../../whatsapp/sendWhatsappOutboundAttendance.js";
import { completeStartedWhatsappConversation } from "../../whatsapp/completeStartedWhatsappConversation.js";
import { assertWhatsappProviderEffectAllowed } from "../../whatsapp/assertWhatsappProviderEffectAllowed.js";

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
  const content = conversationContent(input);
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
      const pendingExternalId = input.idempotencyKey
        ? `crm-local-${fingerprintOutboundIntent(input.idempotencyKey).slice(0, 40)}`
        : createLocalWhatsappExternalId();
      const pendingAt = new Date();
      const pending = await runCrmTransaction(
        ports,
        async (transactionPorts) => {
          const lead = await findOrCreateLead(context, transactionPorts, {
            ...(target.buyerName ? { buyerName: target.buyerName } : {}),
            connectionId: connection.id,
            externalId: pendingExternalId,
            phone: target.phone,
          }).then((createdLead) => target.lead ?? createdLead);
          const ingested = await getCrmWhatsappRepository(
            transactionPorts,
          ).ingestMessage({
            ...(target.buyerName ? { buyerName: target.buyerName } : {}),
            buyerPhone: target.phone,
            channel: channelForCrmProvider(connection.provider),
            connectionId: connection.id,
            content,
            direction: "OUTBOUND",
            externalId: pendingExternalId,
            leadId: lead.id,
            metadata: {
              pendingExternalId,
              provider: connection.provider,
              sentByActorId: context.actor.id,
              sendState: "PENDING_PROVIDER_SEND",
            },
            providerTimestamp: pendingAt,
            senderOrigin: input.senderOrigin ?? "human_crm",
            senderType: input.senderType ?? "HUMAN",
            status: "PENDING",
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
            type: conversationMessageType(input),
          });
          return { ingested, lead };
        },
      );

      const gateway = getCrmWhatsappGateway(ports);
      const effect = await executeDurableOutboundProviderCall(
        context,
        {
          connectionId: connection.id,
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          payload: input,
          senderOrigin: input.senderOrigin ?? "human_crm",
          senderType: input.senderType ?? "HUMAN",
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
          pendingExternalId,
        });
        throw error;
      });
      const sent: SentWhatsappText = effect.sent;

      const result = await completeStartedWhatsappConversation(
        context,
        {
          content,
          createdMessage: pending.ingested.createdMessage,
          interventionId: effect.intent.id,
          lead: pending.lead,
          messageId: pending.ingested.message.id,
          pendingExternalId,
          provider: connection.provider,
          providerExternalId: sent.externalId,
          providerTimestamp: sent.providerTimestamp,
          senderType: input.senderType ?? "HUMAN",
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
