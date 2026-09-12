import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { EnqueueCrmPushIntentResult } from "../../ports/crmPushRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { getCrmPushRepository } from "./serviceSupport.js";

const permission = "crm.messages.ingest";

export type EnqueueInboundCrmPushIntentInput = {
  createdMessage: boolean;
  cycleId: string;
  direction: "inbound" | "outbound";
  idempotencyKey: string;
  messageId: string;
  storeId: string;
  tenantId: string;
  threadId: string | undefined;
};

export type EnqueueInboundCrmPushIntentResult =
  | EnqueueCrmPushIntentResult
  | {
      kind: "skipped";
      reason: "duplicate" | "missing_thread" | "outbound";
    };

export async function enqueueInboundCrmPushIntent(
  context: ServiceContext,
  input: EnqueueInboundCrmPushIntentInput,
  ports: CrmServicePorts,
): Promise<EnqueueInboundCrmPushIntentResult> {
  assertPermission(context, permission);
  assertCompatibleScope(context, input);
  logCrmServiceEvent(context, "crm.push.intent.enqueue.started", {
    cycleId: input.cycleId,
    messageId: input.messageId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const result = await decidePushIntent(input, ports);
  logCrmServiceEvent(context, "crm.push.intent.enqueue.completed", {
    cycleId: input.cycleId,
    messageId: input.messageId,
    result: result.kind,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.push.intent.enqueue",
    category: "data_change",
    entityId: input.cycleId,
    entityType: "crm_conversation_cycle",
    metadata: {
      result: result.kind,
      ...(result.kind === "skipped" ? { reason: result.reason } : {}),
    },
    permission,
    storeId: input.storeId,
    summary: "Evaluated CRM inbound push intent",
    tenantId: input.tenantId,
  });
  return result;
}

async function decidePushIntent(
  input: EnqueueInboundCrmPushIntentInput,
  ports: CrmServicePorts,
): Promise<EnqueueInboundCrmPushIntentResult> {
  if (!input.createdMessage) return { kind: "skipped", reason: "duplicate" };
  if (input.direction !== "inbound") {
    return { kind: "skipped", reason: "outbound" };
  }
  if (!input.threadId) return { kind: "skipped", reason: "missing_thread" };
  return getCrmPushRepository(ports).enqueueCurrentGeneration({
    cycleId: input.cycleId,
    idempotencyKey: input.idempotencyKey,
    messageId: input.messageId,
    storeId: input.storeId,
    tenantId: input.tenantId,
    threadId: input.threadId,
  });
}

function assertCompatibleScope(
  context: ServiceContext,
  input: { storeId: string; tenantId: string },
) {
  if (
    (context.storeId !== null && context.storeId !== input.storeId) ||
    (context.tenantId !== null && context.tenantId !== input.tenantId)
  ) {
    throw new AuthorizationError(
      "CRM push intent scope does not match context.",
    );
  }
}
