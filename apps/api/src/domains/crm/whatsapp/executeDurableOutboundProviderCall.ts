import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { ProviderSentMessage } from "./sendWhatsappOutboundTypes.js";
import {
  fingerprintOutboundIntent,
  outboundIdempotencyConflictError,
  outboundReconciliationPendingError,
  requireOutboundIdempotencyKey,
} from "./sendWhatsappOutboundSupport.js";
import {
  getCrmWhatsappOutboundIntentRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function executeDurableOutboundProviderCall(
  context: ServiceContext,
  input: {
    connectionId: string;
    idempotencyKey?: string;
    payload: unknown;
    send: () => Promise<ProviderSentMessage>;
    sessionId: string | null;
  },
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const repository = getCrmWhatsappOutboundIntentRepository(ports);
  const fingerprint = fingerprintOutboundIntent(input.payload);
  const now = new Date();
  const claimed = await repository.claim({
    connectionId: input.connectionId,
    fingerprint,
    idempotencyKey: requireOutboundIdempotencyKey(
      input.idempotencyKey ??
        `${context.correlationId ?? context.requestId}:${fingerprint}`,
    ),
    now,
    sessionId: input.sessionId,
    staleBefore: new Date(now.getTime() - 2 * 60_000),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (claimed.kind === "conflict") throw outboundIdempotencyConflictError();
  if (claimed.kind === "completed") {
    return {
      completedMessageId: claimed.intent.messageId,
      intent: claimed.intent,
      sent: readReceipt(claimed.intent.providerResult),
    };
  }
  if (claimed.kind === "in_progress" || claimed.kind === "indeterminate") {
    throw outboundReconciliationPendingError();
  }
  if (claimed.kind === "provider_succeeded") {
    return {
      completedMessageId: null,
      intent: claimed.intent,
      sent: readReceipt(claimed.intent.providerResult),
    };
  }
  try {
    const sent = await input.send();
    await repository.recordProviderSuccess({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      providerResult: {
        externalId: sent.externalId,
        providerTimestamp: sent.providerTimestamp.toISOString(),
      },
    });
    return { completedMessageId: null, intent: claimed.intent, sent };
  } catch (error) {
    await repository
      .markIndeterminate({
        claimToken: claimed.intent.claimToken,
        id: claimed.intent.id,
      })
      .catch(() => undefined);
    throw error;
  }
}

export async function completeDurableOutboundProviderCall(
  ports: CrmServicePorts,
  input: {
    claimToken: string;
    id: string;
    messageId: string;
    sessionId: string;
  },
) {
  await getCrmWhatsappOutboundIntentRepository(ports).complete(input);
}

function readReceipt(value: Record<string, unknown> | null) {
  if (
    !value ||
    typeof value.externalId !== "string" ||
    typeof value.providerTimestamp !== "string"
  )
    throw outboundReconciliationPendingError();
  return {
    externalId: value.externalId,
    providerTimestamp: new Date(value.providerTimestamp),
  };
}
