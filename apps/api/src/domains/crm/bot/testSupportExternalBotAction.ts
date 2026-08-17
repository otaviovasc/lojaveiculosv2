import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  canonicalExternalBotActionRequest,
  type ExternalBotActionRequest,
} from "./externalBotCanonicalRequest.js";
import type { createMemoryExternalBotManager } from "./testSupportExternalBotManager.js";

export async function createExternalBotActionRequest(
  manager: ReturnType<typeof createMemoryExternalBotManager>,
  action:
    "conversation.summarize" | "fact.propose" | "message.send" | "task.create",
  payload: Record<string, unknown>,
) {
  const actionClass = action.endsWith(".propose") ? "proposal" : "effect";
  const base = {
    capabilityGrant: "",
    channel: "whatsapp" as const,
    command: { action, payload } as never,
    connectionId: "connection-1",
    expectedRevision: 4,
    idempotencyKey: `idem-${action}`,
    integrationId: "integration-1",
    modelVersion: "model-v1",
    provider: "zapi" as const,
    actionClass: actionClass as "effect" | "proposal",
    storeId: "store-1",
    tenantId: "tenant-1",
    threadId: "thread-1",
  };
  const authorizedRequestDigest = manager.ports.digest.digest(
    canonicalExternalBotActionRequest(base),
  );
  const grant = await manager.ports.grantStore.issue({
    action,
    authorizedRequestDigest,
    actionClass,
    channel: "whatsapp",
    connectionId: "connection-1",
    expiresAt: new Date(Date.now() + 60_000),
    integrationId: "integration-1",
    modelVersion: "model-v1",
    provider: "zapi",
    storeId: "store-1",
    tenantId: "tenant-1",
    threadId: "thread-1",
  });
  return {
    ...base,
    capabilityGrant: grant.token,
  };
}

export function withExternalBotActionDigest<
  Input extends Omit<ExternalBotActionRequest, "requestDigest">,
>(manager: ReturnType<typeof createMemoryExternalBotManager>, unsigned: Input) {
  return {
    ...unsigned,
    requestDigest: manager.ports.digest.digest(
      canonicalExternalBotActionRequest(unsigned),
    ),
  };
}

export function createExternalBotActionContext() {
  return createServiceContext({
    actor: { externalId: "integration-1", id: "bot", kind: "integration" },
    permissions: ["crm.bot.actions.execute"],
    request: { requestId: "request-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}
