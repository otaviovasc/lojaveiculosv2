import { toCanonicalRoutingConnection } from "./ports/crmChannelConnectionProjection.js";
import type { CrmConnection } from "./ports/crmConnectionRepository.js";
import type { CrmRoutingConnectionRepository } from "./ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "./ports/crmRoutingPolicyRepository.js";

export function createTestCrmRoutingRepositories(
  connections: CrmConnection[],
): {
  routingConnectionRepository: CrmRoutingConnectionRepository;
  routingPolicyRepository: CrmRoutingPolicyRepository;
} {
  const routingConnectionRepository: CrmRoutingConnectionRepository = {
    async listConnections(scope) {
      return connections
        .filter(
          (connection) =>
            connection.storeId === scope.storeId &&
            connection.tenantId === scope.tenantId,
        )
        .map(toCanonicalRoutingConnection);
    },
  };
  const policies = new Map<
    string,
    Awaited<ReturnType<CrmRoutingPolicyRepository["upsertPolicy"]>>
  >();
  const routingPolicyRepository: CrmRoutingPolicyRepository = {
    async createDefaultIfMissing(input) {
      const key = `${input.tenantId}:${input.storeId}:${input.channel}`;
      const existing = policies.get(key);
      if (existing?.defaultConnectionId) return null;
      const connection = (
        await routingConnectionRepository.listConnections(input)
      ).find((item) => item.channel === input.channel);
      const policy = existing ?? { ...input, id: crypto.randomUUID() };
      policy.defaultConnectionId ??= connection?.id ?? null;
      policies.set(key, policy);
      return policy;
    },
    async listPolicies(scope) {
      const scopedConnections =
        await routingConnectionRepository.listConnections(scope);
      for (const connection of scopedConnections) {
        const key = `${scope.tenantId}:${scope.storeId}:${connection.channel}`;
        if (!policies.has(key)) {
          policies.set(key, {
            channel: connection.channel,
            defaultConnectionId: connection.id,
            externalBotConnectionId: null,
            externalBotMode: "disabled",
            id: crypto.randomUUID(),
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
        }
      }
      return [...policies.values()].filter(
        (policy) =>
          policy.storeId === scope.storeId &&
          policy.tenantId === scope.tenantId,
      );
    },
    async upsertPolicy(input) {
      const key = `${input.tenantId}:${input.storeId}:${input.channel}`;
      const policy = {
        ...input,
        id: policies.get(key)?.id ?? crypto.randomUUID(),
      };
      policies.set(key, policy);
      return policy;
    },
  };
  return { routingConnectionRepository, routingPolicyRepository };
}
