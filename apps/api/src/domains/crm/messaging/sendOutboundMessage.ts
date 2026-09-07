import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  getCrmMessagingGateway,
  getCrmOutboundIntentRepository,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { CrmMessage } from "../ports/crmConversationRepository.js";
import { providerAddressForSession } from "./crmMessagingProvider.js";
import {
  classifyOutboundIntentRecovery,
  defaultOutboundSenderType,
  fingerprintOutboundIntent,
  outboundIdempotencyConflictError,
  outboundReconciliationPendingError,
  readPreparedOutboundResult,
  resolveOutboundClientRequestId,
  withOutboundClientRequestId,
  writePreparedOutboundResult,
} from "./outboundMessageSupport.js";
import type {
  PreparedOutboundCrmMessage,
  SendOutboundMessageInput,
} from "./outboundMessageTypes.js";
import {
  recordOutboundProviderFailure,
  throwPersistedOutboundFailure,
} from "./outboundProviderFailure.js";
import { claimOutboundIntentWithHumanAssignment } from "./claimOutboundIntentWithHumanAssignment.js";
import { findOutboundConversationCycle } from "../services/CrmMessagingService/conversationCycleMutationSupport.js";
import { createOutboundConnectionResolver } from "./resolveOutboundConnection.js";
import { withHumanCrmSenderSnapshot } from "./crmMessageSender.js";
import { finalizeOutboundMessage } from "./finalizeOutboundMessage.js";
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
  const intents = getCrmOutboundIntentRepository(ports);
  const now = new Date();
  const senderType = input.senderType ?? defaultOutboundSenderType(context);
  const intentFingerprint = fingerprintOutboundIntent({
    payload:
      input.idempotencyPayload ?? input.idempotencyKey ?? context.requestId,
    senderOrigin: input.senderOrigin,
    senderType,
  });
  const clientRequestId = resolveOutboundClientRequestId(
    context,
    input.idempotencyKey,
    intentFingerprint,
  );
  const connectionResolver = createOutboundConnectionResolver(
    context,
    ports,
    input.requiredCapabilities,
  );
  const outbound = await claimOutboundIntentWithHumanAssignment({
    claim: {
      connectionId: initialSession.connectionId,
      fingerprint: intentFingerprint,
      idempotencyKey: clientRequestId,
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
    beforeAssignment: connectionResolver.beforeAssignment,
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
  const connection = await connectionResolver.resolve(
    claimed.kind,
    conversationCycle,
  );
  let providerConfirmed = claimed.kind === "provider_succeeded";
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
    } catch (error) {
      await recordOutboundProviderFailure(intents, claimed.intent, error);
      throw error;
    }
    try {
      prepared = {
        ...prepared,
        metadata: withHumanCrmSenderSnapshot(context, {
          metadata: prepared.metadata,
          senderOrigin: input.senderOrigin,
          senderType,
        }),
      };
      await intents.recordProviderSuccess({
        claimToken: claimed.intent.claimToken,
        id: claimed.intent.id,
        providerResult: writePreparedOutboundResult(prepared),
      });
      providerConfirmed = true;
    } catch {
      // A persistence timeout can happen after the provider-success update
      // committed. Do not overwrite a possibly durable receipt with an
      // indeterminate status; the scheduler resolves the persisted state.
      throw outboundReconciliationPendingError();
    }
  }
  prepared = {
    ...prepared,
    metadata: withOutboundClientRequestId(prepared.metadata, clientRequestId),
  };
  try {
    return await finalizeOutboundMessage(
      context,
      {
        claimToken: claimed.intent.claimToken,
        connection,
        conversationCycle,
        id: claimed.intent.id,
        prepared,
        scope,
        senderOrigin: input.senderOrigin,
        senderType,
      },
      ports,
    );
  } catch (error) {
    const persisted = await intents
      .findByIdempotencyKey({
        idempotencyKey: clientRequestId,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      })
      .catch(() => null);
    if (
      providerConfirmed ||
      classifyOutboundIntentRecovery(persisted) === "confirmed"
    ) {
      throw outboundReconciliationPendingError();
    }
    throw error;
  }
}
