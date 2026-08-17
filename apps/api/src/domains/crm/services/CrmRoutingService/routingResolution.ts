import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingChannel } from "../../ports/crmRoutingPolicyRepository.js";
import type {
  CrmResolvedConnectionRoute,
  CrmRoutingBlockedCode,
  CrmRoutingCapability,
} from "./routingReadModels.js";

export function resolveCrmConnectionRoute(input: {
  channel: CrmRoutingChannel;
  connection: CrmRoutingConnection | null;
  connectionId: string | null;
  requiredCapabilities: readonly CrmRoutingCapability[];
  scope: { storeId: string; tenantId: string };
}): CrmResolvedConnectionRoute {
  if (!input.connectionId) {
    return blocked(
      "policy_not_configured",
      "No connection is configured for this route.",
      "Select a connection for this channel.",
      input.requiredCapabilities,
    );
  }
  const connection = input.connection;
  if (!connection) {
    return blocked(
      "connection_not_found",
      "The configured canonical connection no longer exists.",
      "Select another connection or reconnect the provider account.",
      input.requiredCapabilities,
    );
  }
  if (
    connection.storeId !== input.scope.storeId ||
    connection.tenantId !== input.scope.tenantId
  ) {
    return blocked(
      "scope_mismatch",
      "The configured connection belongs to another store scope.",
      "Select a connection owned by this store.",
      input.requiredCapabilities,
    );
  }
  if (connection.channel !== input.channel) {
    return withConnection(
      connection,
      "channel_incompatible",
      `Connection serves ${connection.channel}, not ${input.channel}.`,
      "Select a connection for the requested channel.",
      input.requiredCapabilities,
    );
  }
  if (connection.state !== "active" || connection.degraded) {
    return withConnection(
      connection,
      "connection_inactive",
      connection.degraded
        ? "Connection is degraded and cannot be routed."
        : `Connection is ${connection.state}, not active.`,
      "Reconnect or activate the provider connection after repairing it.",
      input.requiredCapabilities,
    );
  }
  if (!connection.connected) {
    return withConnection(
      connection,
      "connection_not_connected",
      "The provider connection is not connected.",
      "Complete provider authentication and channel setup.",
      input.requiredCapabilities,
    );
  }
  const missing = input.requiredCapabilities.filter(
    (capability) => connection.capabilities[capability] !== true,
  );
  if (missing.length) {
    return withConnection(
      connection,
      "capability_unsupported",
      `Connection does not support: ${missing.join(", ")}.`,
      "Choose a connection that supports every required capability.",
      input.requiredCapabilities,
    );
  }
  return {
    blocked: null,
    connection: toReadModel(connection),
    ready: true,
    requiredCapabilities: input.requiredCapabilities,
  };
}

function toReadModel(connection: CrmRoutingConnection) {
  return {
    active: connection.state === "active" && !connection.degraded,
    capabilities: (
      Object.keys(connection.capabilities) as CrmRoutingCapability[]
    ).filter((capability) => connection.capabilities[capability]),
    connected: connection.connected,
    displayName: connection.displayName,
    id: connection.id,
    provider: connection.provider,
  };
}

function withConnection(
  connection: CrmRoutingConnection,
  code: CrmRoutingBlockedCode,
  message: string,
  remediation: string,
  requiredCapabilities: readonly CrmRoutingCapability[],
): CrmResolvedConnectionRoute {
  return {
    ...blocked(code, message, remediation, requiredCapabilities),
    connection: toReadModel(connection),
  };
}

function blocked(
  code: CrmRoutingBlockedCode,
  message: string,
  remediation: string,
  requiredCapabilities: readonly CrmRoutingCapability[],
): CrmResolvedConnectionRoute {
  return {
    blocked: { code, message, remediation },
    connection: null,
    ready: false,
    requiredCapabilities,
  };
}
