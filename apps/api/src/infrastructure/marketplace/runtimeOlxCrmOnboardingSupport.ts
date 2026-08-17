import type { OlxCapabilityResult } from "../../domains/marketplace/ports/marketplaceOlxCrmOnboarding.js";
import type { ServiceContext } from "../../shared/serviceContext.js";

export function olxProviderConnectionMetadata(chat: OlxCapabilityResult) {
  const ready = chat.status === "active";
  return {
    capabilities: {
      inbound: ready,
      outbound: ready,
      scheduling: false,
      templates: false,
    },
    connected: ready,
    degraded: chat.status === "error",
    errorCode: ready ? null : chat.reason,
    operationalStatus: { reason: chat.reason, status: chat.status },
    source: "marketplace_oauth",
  };
}

export async function recordOlxDefaultOutcome(
  context: ServiceContext,
  input: { connectionId: string; storeId: string; tenantId: string },
  outcome: "attempted" | "succeeded",
) {
  await context.audit.record({
    action: "crm.routing.policy.default.create",
    actor: context.actor,
    category: "data_change",
    entityId: input.connectionId,
    entityType: "crm_channel_routing_policy",
    metadata: {
      channel: "olx_chat",
      connectionId: input.connectionId,
      permission: "crm.routing.default.manage",
    },
    outcome,
    requestId: context.requestId,
    storeId: input.storeId,
    summary:
      outcome === "attempted"
        ? "Create the first ready OLX Chat default"
        : "Created the first ready OLX Chat default",
    tenantId: input.tenantId,
  });
}
