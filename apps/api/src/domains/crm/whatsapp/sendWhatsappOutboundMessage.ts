import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertOfficialMessagingWindow } from "../messaging/assertOfficialMessagingWindow.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";
import {
  getCrmConnectionRepository,
  getCrmRealtimePublisher,
  getCrmWhatsappGateway,
  getCrmWhatsappOutboundIntentRepository,
  getCrmWhatsappRepository,
  isCrmOlxChatEnabled,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { WhatsappMessage } from "./whatsappModels.js";
import { toWhatsappMessage, toWhatsappSession } from "./whatsappModels.js";
import { forwardWhatsappMessageToBot } from "./whatsappBotWebhookForwarding.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappSessionNotFoundError,
} from "./whatsappSendErrors.js";
import { providerAddressForSession } from "../messaging/crmMessagingProvider.js";
import { assertWhatsappProviderEffectAllowed } from "./assertWhatsappProviderEffectAllowed.js";
import {
  defaultOutboundSenderType,
  fingerprintOutboundIntent,
  outboundIdempotencyConflictError,
  outboundReconciliationPendingError,
  readPreparedOutboundResult,
  recordOutboundLeadInteraction,
  requireOutboundIdempotencyKey,
  writePreparedOutboundResult,
} from "./sendWhatsappOutboundSupport.js";
import type {
  PreparedOutboundWhatsappMessage,
  SendWhatsappOutboundInput,
} from "./sendWhatsappOutboundTypes.js";
import {
  notifyHumanOutboundAttendanceStarted,
  transitionConfirmedHumanOutboundAttendance,
} from "./sendWhatsappOutboundAttendance.js";
import {
  recordOutboundProviderFailure,
  throwPersistedOutboundFailure,
} from "./outboundProviderFailure.js";

export type {
  PreparedOutboundWhatsappMessage,
  ProviderSentMessage,
  SendWhatsappOutboundInput,
} from "./sendWhatsappOutboundTypes.js";

export async function sendWhatsappOutboundMessage(
  context: ServiceContext,
  input: SendWhatsappOutboundInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  const scope = requireCrmScope(context);
  const whatsappRepository = getCrmWhatsappRepository(ports);
  const [session] = await whatsappRepository.listSessions({
    limit: 1,
    offset: 0,
    sessionId: input.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new WhatsappSessionNotFoundError(input.sessionId);

  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    session.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== session.storeId ||
    connection.tenantId !== session.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(session.connectionId);
  }
  assertWhatsappProviderEffectAllowed(context, connection, {
    olxChatEnabled: isCrmOlxChatEnabled(ports),
  });
  await assertOfficialMessagingWindow(connection, session, whatsappRepository);
  const intents = getCrmWhatsappOutboundIntentRepository(ports);
  const now = new Date();
  const senderType = input.senderType ?? defaultOutboundSenderType(context);
  const intentFingerprint = fingerprintOutboundIntent({
    payload:
      input.idempotencyPayload ?? input.idempotencyKey ?? context.requestId,
    senderOrigin: input.senderOrigin,
    senderType,
  });
  const claimed = await intents.claim({
    connectionId: connection.id,
    fingerprint: intentFingerprint,
    idempotencyKey: requireOutboundIdempotencyKey(
      input.idempotencyKey ??
        `${context.correlationId ?? context.requestId}:${intentFingerprint}`,
    ),
    now,
    sessionId: session.id,
    staleBefore: new Date(now.getTime() - 2 * 60_000),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (claimed.kind === "conflict") {
    throw outboundIdempotencyConflictError();
  }
  if (claimed.kind === "completed") {
    if (claimed.intent.messageId) {
      const existing = await whatsappRepository.findMessageById({
        messageId: claimed.intent.messageId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (existing) return toWhatsappMessage(existing);
    }
    throw outboundReconciliationPendingError();
  }
  if (claimed.kind === "in_progress" || claimed.kind === "indeterminate") {
    throw outboundReconciliationPendingError();
  }
  if (claimed.kind === "failed") {
    throwPersistedOutboundFailure(claimed.intent.providerResult);
  }
  let prepared: PreparedOutboundWhatsappMessage;
  if (claimed.kind === "provider_succeeded") {
    prepared = readPreparedOutboundResult(claimed.intent.providerResult);
  } else {
    try {
      prepared = await input.prepare({
        connection,
        gateway: getCrmWhatsappGateway(ports),
        phone: providerAddressForSession(session),
        scope,
        session,
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
    ...(session.buyerChatLid ? { buyerChatLid: session.buyerChatLid } : {}),
    ...(session.buyerName ? { buyerName: session.buyerName } : {}),
    buyerPhone: session.buyerPhone,
    channel: session.channel,
    ...(session.channelExternalId
      ? { channelExternalId: session.channelExternalId }
      : {}),
    connectionId: connection.id,
    content: prepared.content,
    direction: "OUTBOUND",
    externalId: prepared.sent.externalId,
    firstHandledAt: prepared.sent.providerTimestamp,
    leadId: session.leadId,
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
      senderType,
      senderOrigin: result.message.senderOrigin,
      session: result.session,
    },
  );
  const currentSession = attendanceTransition.session;

  if (session.leadId && result.createdMessage) {
    await recordOutboundLeadInteraction(
      context,
      {
        content: prepared.leadActivityContent ?? prepared.content,
        leadId: session.leadId,
        messageExternalId: prepared.sent.externalId,
        occurredAt: prepared.sent.providerTimestamp,
        provider: connection.provider,
        sessionId: session.id,
      },
      ports,
    );
  }

  const message = toWhatsappMessage(result.message);
  await intents.complete({
    claimToken: claimed.intent.claimToken,
    id: claimed.intent.id,
    messageId: String(result.message.id),
    sessionId: String(currentSession.id),
  });
  const realtimeSession = toWhatsappSession(currentSession, connection);
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    message,
    session: realtimeSession,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message",
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    session: realtimeSession,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "session",
  });
  await forwardWhatsappMessageToBot(
    context,
    {
      connection,
      message: result.message,
      session: currentSession,
    },
    ports,
  );
  await notifyHumanOutboundAttendanceStarted(
    context,
    {
      changed: attendanceTransition.changed,
      connection,
      providerTimestamp: prepared.sent.providerTimestamp,
      session: currentSession,
    },
    ports,
  );

  return message;
}
