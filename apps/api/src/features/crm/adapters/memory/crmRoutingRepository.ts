import type {
  CrmRoutingConnection,
  CrmRoutingConnectionRepository,
} from "../../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../../../../domains/crm/ports/crmRoutingPolicyRepository.js";

export function createMemoryCrmRoutingRepositories(
  input: {
    connections?: readonly CrmRoutingConnection[];
    policies?: readonly CrmChannelRoutingPolicy[];
  } = {},
): {
  connectionRepository: CrmRoutingConnectionRepository;
  policyRepository: CrmRoutingPolicyRepository;
} {
  const connections = [...(input.connections ?? [])];
  const policies = [...(input.policies ?? [])];
  return {
    connectionRepository: {
      async listConnections(scope) {
        return connections.filter(
          (connection) =>
            connection.storeId === scope.storeId &&
            connection.tenantId === scope.tenantId,
        );
      },
      async synchronizeLegacyConnections() {},
      async verifyLegacyMappings(input) {
        return input.connectionIds;
      },
    },
    policyRepository: {
      async listPolicies(scope) {
        return policies.filter(
          (policy) =>
            policy.storeId === scope.storeId &&
            policy.tenantId === scope.tenantId,
        );
      },
      async upsertPolicy(next) {
        const existing = policies.find(
          (policy) =>
            policy.channel === next.channel &&
            policy.storeId === next.storeId &&
            policy.tenantId === next.tenantId,
        );
        if (existing) {
          Object.assign(existing, next);
          return existing;
        }
        const created: CrmChannelRoutingPolicy = {
          ...next,
          id: crypto.randomUUID(),
        };
        policies.push(created);
        return created;
      },
    },
  };
}
