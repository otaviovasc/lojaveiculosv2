import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { IngestCrmMessageResult } from "../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { enqueueInboundCrmPushIntent } from "../services/CrmPushService/enqueueInboundCrmPushIntent.js";
import { buildCrmPushIntentIdempotencyKey } from "../push/pushPolicy.js";

export function enqueueCreatedInboundCrmPushIntent(
  context: ServiceContext,
  result: IngestCrmMessageResult,
  ports: CrmServicePorts,
  threadId = result.conversationCycle.threadId,
) {
  const { conversationCycle, message } = result;
  return enqueueInboundCrmPushIntent(
    context,
    {
      createdMessage: result.createdMessage,
      cycleId: conversationCycle.id,
      direction: message.direction === "INBOUND" ? "inbound" : "outbound",
      idempotencyKey: buildCrmPushIntentIdempotencyKey({
        cycleId: conversationCycle.id,
        messageId: message.id,
        storeId: conversationCycle.storeId,
        tenantId: conversationCycle.tenantId,
      }),
      messageId: message.id,
      storeId: conversationCycle.storeId,
      tenantId: conversationCycle.tenantId,
      threadId,
    },
    ports,
  );
}
