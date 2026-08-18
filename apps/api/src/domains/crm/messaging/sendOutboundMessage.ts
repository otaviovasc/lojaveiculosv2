import type { ServiceContext } from "../../../shared/serviceContext.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";
import {
  getCrmRealtimePublisher,
  getCrmMessagingGateway,
  getCrmOutboundIntentRepository,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { CrmMessage } from "../ports/crmConversationRepository.js";
import { enqueueCrmMessageExternalBotEvent } from "../bot/externalBotEventForwarding.js";
import { providerAddressForSession } from "./crmMessagingProvider.js";
import {
  defaultOutboundSenderType,
  fingerprintOutboundIntent,
  outboundIdempotencyConflictError,
  outboundReconciliationPendingError,
  readPreparedOutboundResult,
  recordOutboundLeadInteraction,
  requireOutboundIdempotencyKey,
  writePreparedOutboundResult,
} from "./outboundMessageSupport.js";
import type {
  PreparedOutboundCrmMessage,
  SendOutboundMessageInput,
} from "./outboundMessageTypes.js";
import {
  notifyHumanOutboundAttendanceStarted,
  transitionConfirmedHumanOutboundAttendance,
} from "./outboundAttendance.js";
import {
  recordOutboundProviderFailure,
  throwPersistedOutboundFailure,
} from "./outboundProviderFailure.js";
import { claimOutboundIntentWithHumanAssignment } from "./claimOutboundIntentWithHumanAssignment.js";
import { findOutboundConversationCycle } from "../services/CrmMessagingService/conversationCycleMutationSupport.js";
import { resolveOutboundConnection } from "./resolveOutboundConnection.js";

export type {
  PreparedOutboundCrmMessage,
  ProviderSentMessage,
  SendOutboundMessageInput,
} from "./outboundMessageTypes.js";

export async function sendOutboundMessage(
  context: ServiceContext,
  input: SendOutboundMessageInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  const {
    requiresAssignment,
    scope,
    conversationCycle: initialSession,
  } = await findOutboundConversationCycle(context, input, ports);
  const whatsappRepository = getCrmConversationRepository(ports);

  const connection = await resolveOutboundConnection(
    context,
    initialSession,
    ports,
    input.requiredCapabilities,
  );
  const intents = getCrmOutboundIntentRepository(ports);
  const now = new Date();
  const senderType = input.senderType ?? defaultOutboundSenderType(context);
  const intentFingerprint = fingerprintOutboundIntent({
    payload:
      input.idempotencyPayload ?? input.idempotencyKey ?? context.requestId,
    senderOrigin: input.senderOrigin,
    senderType,
  });
  const outbound = await claimOutboundIntentWithHumanAssignment({
    claim: {
      connectionId: connection.id,
      fingerprint: intentFingerprint,
      idempotencyKey: requireOutboundIdempotencyKey(
        input.idempotencyKey ??
          `${context.correlationId ?? context.requestId}:${intentFingerprint}`,
      ),
      now,
      cycleId: initialSession.id,
      staleBefore: new Date(now.getTime() - 2 * 60_000),
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    },
    context,
    ports,
    providerTimestamp: now,
    requiredForAccess: requiresAssignment,
    scope,
    senderOrigin: input.senderOrigin,
    senderType,
    conversationCycle: initialSession,
  });
  const claimed = outbound.claimed;
  if (claimed.kind === "conflict") {
    throw outboundIdempotencyConflictError();
  }
  const conversationCycle = outbound.conversationCycle;
  if (claimed.kind === "completed") {
    if (claimed.intent.messageId) {
      const existing = await whatsappRepository.findMessageById({
        messageId: claimed.intent.messageId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (existing) return existing;
    }
    throw outboundReconciliationPendingError();
  }
  if (claimed.kind === "in_progress" || claimed.kind === "indeterminate") {
    throw outboundReconciliationPendingError();
  }
  if (claimed.kind === "failed") {
    throwPersistedOutboundFailure(claimed.intent.providerResult);
  }
  let prepared: PreparedOutboundCrmMessage;
  if (claimed.kind === "provider_succeeded") {
    prepared = readPreparedOutboundResult(claimed.intent.providerResult);
  } else {
    try {
      prepared = await input.prepare({
        connection,
        gateway: getCrmMessagingGateway(ports),
        phone: providerAddressForSession(conversationCycle),
        scope,
        conversationCycle,
      });
      await intents.recordProviderSuccess({
        claimToken: claimed.intent.claimToken,
        id: claimed.intent.id,
        providerResult: writePreparedOutboundResult(prepared),
      });
    } catch (error) {
      await recordOutboundProviderFailure(intents, claimed.intent, error);
      throw error;
    }
  }
  const result = await whatsappRepository.ingestMessage({
    ...(conversationCycle.customerChatId
      ? { customerChatId: conversationCycle.customerChatId }
      : {}),
    ...(conversationCycle.customerDisplayName
      ? { customerDisplayName: conversationCycle.customerDisplayName }
      : {}),
    customerPhone: conversationCycle.customerPhone,
    channel: conversationCycle.channel,
    ...(conversationCycle.externalThreadId
      ? { externalThreadId: conversationCycle.externalThreadId }
      : {}),
    connectionId: connection.id,
    content: prepared.content,
    direction: "OUTBOUND",
    externalId: prepared.sent.externalId,
    firstHandledAt: prepared.sent.providerTimestamp,
    leadId: conversationCycle.leadId,
    ...(prepared.mediaType ? { mediaType: prepared.mediaType } : {}),
    ...(prepared.mediaUrl ? { mediaUrl: prepared.mediaUrl } : {}),
    metadata: prepared.metadata,
    providerTimestamp: prepared.sent.providerTimestamp,
    senderOrigin: input.senderOrigin,
    senderType,
    status: "SENT",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    type: prepared.type,
  });
  const attendanceTransition = await transitionConfirmedHumanOutboundAttendance(
    {
      actorId: context.actor.id,
      actorKind: interventionActorKind(context.actor.kind, "admin"),
      interventionId: claimed.intent.id,
      providerTimestamp: prepared.sent.providerTimestamp,
      repository: whatsappRepository,
      senderOrigin: result.message.senderOrigin,
      senderType,
      conversationCycle: result.conversationCycle,
    },
  );
  const currentSession = attendanceTransition.conversationCycle;

  if (conversationCycle.leadId && result.createdMessage) {
    await recordOutboundLeadInteraction(
      context,
      {
        content: prepared.leadActivityContent ?? prepared.content,
        leadId: conversationCycle.leadId,
        messageExternalId: prepared.sent.externalId,
        occurredAt: prepared.sent.providerTimestamp,
        provider: connection.provider,
        cycleId: conversationCycle.id,
      },
      ports,
    );
  }

  const message = result.message;
  await intents.complete({
    claimToken: claimed.intent.claimToken,
    id: claimed.intent.id,
    messageId: String(result.message.id),
    cycleId: String(currentSession.id),
  });
  const realtimeSession = currentSession;
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    message,
    conversationCycle: realtimeSession,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message",
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    conversationCycle: realtimeSession,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "conversationCycle",
  });
  await enqueueCrmMessageExternalBotEvent(
    context,
    {
      connection,
      message: result.message,
      conversationCycle: currentSession,
    },
    ports,
  );
  await notifyHumanOutboundAttendanceStarted(
    context,
    {
      changed: attendanceTransition.changed,
      connection,
      providerTimestamp: prepared.sent.providerTimestamp,
      conversationCycle: currentSession,
    },
    ports,
  );

  return message;
}
