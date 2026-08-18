import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { crmChannelConnectionCapabilityFacts } from "../../../domains/crm/channelConnections/connectionCreation.js";

export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;

export function context() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["crm.messages.send"],
      request: { requestId: "request_1" },
      storeId,
      tenantId,
    }),
    { entitlements: ["crm"] as const },
  );
}

export function serverContext(kind: "integration" | "system") {
  return Object.assign(
    createServiceContext({
      actor: { id: `crm-${kind}`, kind },
      permissions: ["crm.messages.send"],
      request: { requestId: `request-${kind}` },
      storeId,
      tenantId,
    }),
    { entitlements: ["crm"] as const },
  );
}

export function connection() {
  return {
    broker: "composio" as const,
    channel: "whatsapp" as const,
    credentialsRef: {},
    displayName: "Official",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection_1",
    metadata: {
      capabilities: crmChannelConnectionCapabilityFacts({
        broker: "composio",
        channel: "whatsapp",
        provider: "meta_cloud",
      }),
      connected: true,
      degraded: false,
      errorCode: null,
    },
    phone: null,
    provider: "meta_cloud" as const,
    status: "active" as const,
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

export function claimInput(now: Date) {
  return {
    connectionId: "connection_1",
    fingerprint: "fingerprint",
    idempotencyKey: "key_1",
    now,
    cycleId: "cycle_1",
    staleBefore: new Date(now.getTime() - 120_000),
    storeId,
    tenantId,
  };
}
