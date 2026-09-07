import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmConversationCycle,
  CrmMessage,
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
} from "../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  getCrmOutboundIntentRepository,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { enqueueCrmMessageExternalBotEvent } from "../bot/externalBotEventForwarding.js";
import {
  notifyHumanOutboundAttendanceStarted,
  transitionConfirmedHumanOutboundAttendance,
} from "./outboundAttendance.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";
import type { PreparedOutboundCrmMessage } from "./outboundMessageTypes.js";
import { recordOutboundLeadInteraction } from "./outboundMessageSupport.js";

export async function finalizeOutboundMessage(
  context: ServiceContext,
  input: {
    claimToken: string;
    connection: CrmConnection;
    conversationCycle: CrmConversationCycle;
    id: string;
    prepared: PreparedOutboundCrmMessage;
    scope: { storeId: string; tenantId: string };
    senderOrigin: CrmMessageSenderOrigin;
    senderType: CrmMessageSenderType;
  },
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  const repository = getCrmConversationRepository(ports);
  const result = await repository.ingestMessage({
    ...(input.conversationCycle.customerChatId
      ? { customerChatId: input.conversationCycle.customerChatId }
      : {}),
    ...(input.conversationCycle.customerDisplayName
      ? { customerDisplayName: input.conversationCycle.customerDisplayName }
      : {}),
    customerPhone: input.conversationCycle.customerPhone,
    channel: input.conversationCycle.channel,
    ...(input.conversationCycle.externalThreadId
      ? { externalThreadId: input.conversationCycle.externalThreadId }
      : {}),
    connectionId: input.connection.id,
    content: input.prepared.content,
    direction: "OUTBOUND",
    externalId: input.prepared.sent.externalId,
    firstHandledAt: input.prepared.sent.providerTimestamp,
    leadId: input.conversationCycle.leadId,
    ...(input.prepared.mediaType
      ? { mediaType: input.prepared.mediaType }
      : {}),
    ...(input.prepared.mediaUrl ? { mediaUrl: input.prepared.mediaUrl } : {}),
    metadata: input.prepared.metadata,
    providerTimestamp: input.prepared.sent.providerTimestamp,
    senderOrigin: input.senderOrigin,
    senderType: input.senderType,
    status: "SENT",
    storeId: input.scope.storeId as never,
    tenantId: input.scope.tenantId as never,
    type: input.prepared.type,
  });
  const attendanceTransition = await transitionConfirmedHumanOutboundAttendance(
    {
      actorId: context.actor.id,
      actorKind: interventionActorKind(context.actor.kind, "admin"),
      interventionId: input.id,
      providerTimestamp: input.prepared.sent.providerTimestamp,
      repository,
      senderOrigin: result.message.senderOrigin,
      senderType: input.senderType,
      conversationCycle: result.conversationCycle,
    },
  );
  const currentSession = attendanceTransition.conversationCycle;
  if (input.conversationCycle.leadId && result.createdMessage) {
    await recordOutboundLeadInteraction(
      context,
      {
        content: input.prepared.leadActivityContent ?? input.prepared.content,
        leadId: input.conversationCycle.leadId,
        messageExternalId: input.prepared.sent.externalId,
        occurredAt: input.prepared.sent.providerTimestamp,
        provider: input.connection.provider,
        cycleId: input.conversationCycle.id,
      },
      ports,
    );
  }

  const message = result.message;
  await getCrmOutboundIntentRepository(ports).complete({
    claimToken: input.claimToken,
    id: input.id,
    messageId: String(message.id),
    cycleId: String(currentSession.id),
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connection.id,
    message,
    conversationCycle: currentSession,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
    type: "message",
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connection.id,
    conversationCycle: currentSession,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
    type: "conversationCycle",
  });
  await enqueueCrmMessageExternalBotEvent(
    context,
    {
      connection: input.connection,
      message,
      conversationCycle: currentSession,
    },
    ports,
  );
  await notifyHumanOutboundAttendanceStarted(
    context,
    {
      changed: attendanceTransition.changed,
      connection: input.connection,
      providerTimestamp: input.prepared.sent.providerTimestamp,
      conversationCycle: currentSession,
    },
    ports,
  );
  return message;
}
