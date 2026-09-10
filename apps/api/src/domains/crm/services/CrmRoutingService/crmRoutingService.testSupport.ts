import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

export function routingContext(permissions: string[]) {
  return Object.assign(
    createServiceContext({
      actor: { id: "actor-1", kind: "user" },
      permissions,
      request: { requestId: "request-1" },
      storeId: "store-1",
      tenantId: "tenant-1",
    }),
    { entitlements: ["crm"] as const },
  );
}

export function routingConnection(
  channel: CrmRoutingConnection["channel"],
  provider: CrmRoutingConnection["provider"],
  id: string,
): CrmRoutingConnection {
  return {
    capabilities: {
      inbound: true,
      outbound: true,
      scheduling: true,
      templates: false,
    },
    channel,
    connected: true,
    credentialBroker: provider === "meta_cloud" ? "composio" : "direct",
    degraded: false,
    displayName: id,
    errorCode: null,
    id,
    provider,
    state: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  };
}

export function routingPolicy(
  channel: CrmChannelRoutingPolicy["channel"],
  connectionId: string,
): CrmChannelRoutingPolicy {
  return {
    externalBotConnectionId: null,
    externalBotMode: "inherit_store_default",
    channel,
    defaultConnectionId: connectionId,
    id: `policy-${channel}`,
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
  };
}

export function routingPorts(
  connections: readonly CrmRoutingConnection[],
  initialPolicies: readonly CrmChannelRoutingPolicy[],
): CrmServicePorts {
  const policies = [...initialPolicies];
  const policyRepository: CrmRoutingPolicyRepository = {
    createDefaultIfMissing: async () => null,
    listPolicies: async () => policies,
    upsertPolicy: async (input) => {
      const next = { ...input, id: `policy-${input.channel}` };
      const index = policies.findIndex(
        (item) => item.channel === input.channel,
      );
      if (index >= 0) policies[index] = next;
      else policies.push(next);
      return next;
    },
  };
  return {
    crmRepository: {} as never,
    crmRoutingConnectionRepository: {
      listConnections: async () => connections,
    },
    crmRoutingPolicyRepository: policyRepository,
  };
}
