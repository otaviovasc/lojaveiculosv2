import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmRoutingConnection } from "../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type { CrmChannelRoutingPolicy } from "../../../domains/crm/ports/crmRoutingPolicyRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import {
  createTestApp,
  defaultWhatsappPermissions,
} from "./crm.controller.testSupport.js";

export const connectionId = "24000000-0000-4000-8000-000000000301";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

export async function scheduledFixture(
  input: {
    additionalConnection?: CrmRoutingConnection;
    connection?: Partial<CrmRoutingConnection>;
    defaultConnectionId?: string;
    entitlements?: [];
    permissions?: PermissionKey[];
  } = {},
) {
  const conversationRepository = createMemoryCrmConversationRepository();
  const ingested = await conversationRepository.ingestMessage({
    customerPhone: "5511999999301",
    channel: "WHATSAPP",
    connectionId,
    content: "Oi",
    direction: "INBOUND",
    externalId: "scheduled-route-seed",
    metadata: {},
    providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
  const connection = canonicalConnection(input.connection);
  const routing = createMemoryCrmRoutingRepositories({
    connections: [
      connection,
      ...(input.additionalConnection ? [input.additionalConnection] : []),
    ],
    policies: [policy(input.defaultConnectionId ?? connection.id)],
  });
  return {
    app: createTestApp({
      crmRoutingConnectionRepository: routing.connectionRepository,
      crmRoutingPolicyRepository: routing.policyRepository,
      crmConversationRepository: conversationRepository,
      ...(input.entitlements ? { entitlements: input.entitlements } : {}),
      permissions: input.permissions ?? defaultWhatsappPermissions,
    }),
    cycleId: ingested.conversationCycle.id,
  };
}

export function schedule(
  app: ReturnType<typeof createTestApp>,
  cycleId: string,
) {
  return app.request("/api/v1/crm/scheduled-messages", {
    body: JSON.stringify({
      scheduledAt: "2030-01-01T10:00:00.000Z",
      cycleId,
      content: "Mensagem agendada",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function canonicalConnection(
  override: Partial<CrmRoutingConnection> = {},
): CrmRoutingConnection {
  return {
    capabilities: capabilities(),
    channel: "whatsapp",
    connected: true,
    credentialBroker: "direct",
    degraded: false,
    displayName: "WhatsApp principal",
    errorCode: null,
    id: connectionId,
    provider: "zapi",
    state: "active",
    storeId,
    tenantId,
    ...override,
  };
}

export function capabilities(
  override: Partial<CrmRoutingConnection["capabilities"]> = {},
) {
  return {
    inbound: true,
    outbound: true,
    scheduling: true,
    templates: false,
    ...override,
  };
}

function policy(defaultConnectionId: string): CrmChannelRoutingPolicy {
  return {
    externalBotConnectionId: null,
    externalBotMode: "disabled",
    channel: "whatsapp",
    defaultConnectionId,
    id: "scheduled-route-policy",
    storeId,
    tenantId,
  };
}
