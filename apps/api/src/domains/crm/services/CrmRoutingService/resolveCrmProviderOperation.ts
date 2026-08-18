import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessagingChannel } from "../../ports/crmRoutingPolicyRepository.js";
import {
  getCrmConnectionRepository,
  getCrmRoutingConnectionRepository,
  getCrmRoutingPolicyRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { CrmRoutingPolicyValidationError } from "./routingErrors.js";
import type { CrmRoutingCapability } from "./routingReadModels.js";
import { resolveCrmConnectionRoute } from "./routingResolution.js";

export type CrmProviderOperationPorts = Pick<
  CrmServicePorts,
  | "crmConnectionRepository"
  | "crmRoutingConnectionRepository"
  | "crmRoutingPolicyRepository"
>;

export async function resolveCrmProviderOperation(input: {
  channel: CrmMessagingChannel;
  connectionId?: string | null;
  ports: CrmProviderOperationPorts;
  requiredCapabilities: readonly CrmRoutingCapability[];
  scope: { storeId: string; tenantId: string };
}): Promise<CrmConnection> {
  const [connections, policies] = await Promise.all([
    getCrmRoutingConnectionRepository(input.ports).listConnections(
      input.scope as never,
    ),
    input.connectionId
      ? Promise.resolve([])
      : getCrmRoutingPolicyRepository(input.ports).listPolicies(
          input.scope as never,
        ),
  ]);
  const connectionId =
    input.connectionId ??
    policies.find((policy) => policy.channel === input.channel)
      ?.defaultConnectionId ??
    null;
  const route = resolveCrmConnectionRoute({
    channel: input.channel,
    connection:
      connections.find((connection) => connection.id === connectionId) ?? null,
    connectionId,
    requiredCapabilities: input.requiredCapabilities,
    scope: input.scope,
  });
  if (!route.ready || !route.connection) {
    throw new CrmRoutingPolicyValidationError(
      route.blocked?.message ?? "CRM provider route is unavailable.",
      route.blocked?.code ?? "connection_not_found",
    );
  }
  const connection = await getCrmConnectionRepository(
    input.ports,
  ).findConnectionById(route.connection.id);
  if (
    !connection ||
    connection.storeId !== input.scope.storeId ||
    connection.tenantId !== input.scope.tenantId
  ) {
    throw new CrmRoutingPolicyValidationError(
      "The resolved provider connection no longer exists in this store.",
      "connection_not_found",
    );
  }
  return connection;
}
