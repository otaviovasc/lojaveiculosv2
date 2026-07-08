import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type { CrmWhatsappMessageSenderType } from "../../ports/crmWhatsappRepository.js";
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
  requireCrmScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  createLocalWhatsappExternalId,
  failedMessageMetadata,
  findConversationSession,
  findOrCreateLead,
  publishConversation,
  recordLeadInteraction,
  sentMessageMetadata,
  updateStartedConversationMessage,
} from "../../whatsapp/startWhatsappConversationSupport.js";
import { resolveStartConversationTarget } from "../../whatsapp/startWhatsappConversationTarget.js";

const permission = "crm.whatsapp.send";
type SentWhatsappText = Awaited<
  ReturnType<ReturnType<typeof getCrmWhatsappGateway>["sendText"]>
>;
export type StartWhatsappConversationInput = {
  buyerName?: string;
  connectionId: string;
  leadId?: string;
  phone?: string;
  senderType?: CrmWhatsappMessageSenderType;
  text: string;
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
  const scope = requireCrmScope(context);
  const target = await resolveStartConversationTarget(context, input, ports);
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
      metadata: { textLength: input.text.length },
      permission,
      summary: "Started CRM WhatsApp conversation",
    },
    async () => {
      const connection = await getCrmConnectionRepository(
        ports,
      ).findConnectionById(input.connectionId);
      if (
        !connection ||
        connection.storeId !== scope.storeId ||
        connection.tenantId !== scope.tenantId
      ) {
        throw new WhatsappConnectionNotFoundError(input.connectionId);
      }
      const pendingExternalId = createLocalWhatsappExternalId();
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
            channel: "WHATSAPP",
            connectionId: connection.id,
            content: input.text,
            direction: "OUTBOUND",
            externalId: pendingExternalId,
            firstHandledAt: pendingAt,
            leadId: lead.id,
            metadata: {
              pendingExternalId,
              provider: connection.provider,
              sentByActorId: context.actor.id,
              sendState: "PENDING_PROVIDER_SEND",
            },
            providerTimestamp: pendingAt,
            senderType: input.senderType ?? "HUMAN",
            status: "PENDING",
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
            type: "TEXT",
          });
          return { ingested, lead };
        },
      );

      let sent: SentWhatsappText;
      try {
        sent = await getCrmWhatsappGateway(ports).sendText(connection, {
          phone: target.phone,
          text: input.text,
        });
      } catch (error) {
        await markPendingMessageFailed(context, ports, {
          connectionProvider: connection.provider,
          error,
          messageId: pending.ingested.message.id,
          pendingExternalId,
        });
        throw error;
      }

      const result = await runCrmTransaction(
        ports,
        async (transactionPorts) => {
          const persistedMessage = await updateStartedConversationMessage(
            context,
            transactionPorts,
            {
              externalId: sent.externalId,
              messageId: pending.ingested.message.id,
              metadata: sentMessageMetadata({
                pendingExternalId,
                provider: connection.provider,
                raw: sent.raw,
                sentByActorId: context.actor.id,
              }),
              providerTimestamp: sent.providerTimestamp,
              status: "SENT",
            },
          );
          const lead = pending.ingested.createdMessage
            ? await recordLeadInteraction(context, transactionPorts, {
                content: input.text,
                lead: pending.lead,
                messageExternalId: sent.externalId,
                occurredAt: sent.providerTimestamp,
                raw: sent.raw,
                sessionId: pending.ingested.session.id,
              })
            : pending.lead;
          const persistedSession = await findConversationSession(
            context,
            transactionPorts,
            pending.ingested.session.id,
          );
          return { lead, message: persistedMessage, session: persistedSession };
        },
      );

      const message = toWhatsappMessage(result.message);
      const session = toWhatsappSession(result.session, connection);
      await publishConversation(ports, {
        connectionId: connection.id,
        message,
        session,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      return { lead: result.lead, message, session };
    },
  );
}

async function markPendingMessageFailed(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    connectionProvider: string;
    error: unknown;
    messageId: string;
    pendingExternalId: string;
  },
) {
  await updateStartedConversationMessage(context, ports, {
    messageId: input.messageId,
    metadata: failedMessageMetadata({
      errorName:
        input.error instanceof Error ? input.error.name : "UnknownError",
      pendingExternalId: input.pendingExternalId,
      provider: input.connectionProvider,
      sentByActorId: context.actor.id,
    }),
    status: "FAILED",
  }).catch((updateError) => {
    context.logger.warn("crm.whatsapp.conversation.start.failed_mark_failed", {
      errorName:
        updateError instanceof Error ? updateError.name : "UnknownError",
      messageId: input.messageId,
      requestId: context.requestId,
    });
  });
}
