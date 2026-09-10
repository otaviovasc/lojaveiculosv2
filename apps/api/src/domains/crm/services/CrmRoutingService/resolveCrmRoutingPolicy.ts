import { crmMessagingChannels } from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmMessagingChannel } from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import {
  getCrmRoutingConnectionRepository,
  getCrmRoutingPolicyRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type {
  CrmChannelRoutingReadModel,
  CrmRoutingCapability,
  CrmRoutingPolicyReadModel,
} from "./routingReadModels.js";
import { resolveCrmConnectionRoute } from "./routingResolution.js";

export async function resolveCrmRoutingPolicy(
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
  requiredCapabilities: readonly CrmRoutingCapability[],
): Promise<CrmRoutingPolicyReadModel> {
  const [policies, connections] = await Promise.all([
    getCrmRoutingPolicyRepository(ports).listPolicies(scope as never),
    getCrmRoutingConnectionRepository(ports).listConnections(scope as never),
  ]);
  const byChannel = new Map(policies.map((policy) => [policy.channel, policy]));
  const byId = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  const channels = crmMessagingChannels.map(
    (channel): CrmChannelRoutingReadModel => {
      const policy = byChannel.get(channel);
      const defaultConnectionId = policy?.defaultConnectionId ?? null;
      const storeDefault = resolveCrmConnectionRoute({
        channel,
        connection: defaultConnectionId
          ? (byId.get(defaultConnectionId) ?? null)
          : null,
        connectionId: defaultConnectionId,
        requiredCapabilities,
        scope,
      });
      const externalBotMode = policy?.externalBotMode ?? "disabled";
      if (externalBotMode === "disabled") {
        return {
          bot: {
            blocked: {
              code: "route_disabled",
              message: "Bot routing is disabled for this channel.",
              remediation: "Enable inherited or explicit bot routing.",
            },
            connection: null,
            mode: externalBotMode,
            ready: false,
            requiredCapabilities,
          },
          channel,
          storeDefault,
        };
      }
      const externalBotConnectionId =
        externalBotMode === "inherit_store_default"
          ? defaultConnectionId
          : externalBotMode === "explicit_connection"
            ? (policy?.externalBotConnectionId ?? null)
            : null;
      if (externalBotMode === "all_channel_connections") {
        return {
          bot: resolveChannelWideBotRoute(
            channel,
            connections,
            requiredCapabilities,
            scope,
          ),
          channel,
          storeDefault,
        };
      }
      return {
        bot: {
          ...resolveCrmConnectionRoute({
            channel,
            connection: externalBotConnectionId
              ? (byId.get(externalBotConnectionId) ?? null)
              : null,
            connectionId: externalBotConnectionId,
            requiredCapabilities,
            scope,
          }),
          mode: externalBotMode,
        },
        channel,
        storeDefault,
      };
    },
  );
  return { channels, ...scope };
}

/**
 * Channel-wide bot route: ready when at least one connection of the channel is
 * routable. No single connection represents the route, so `connection` stays
 * null; when nothing is routable, the blocked reason is derived from the first
 * channel connection (or the missing policy) so the UI can still explain why.
 */
function resolveChannelWideBotRoute(
  channel: CrmMessagingChannel,
  connections: readonly CrmRoutingConnection[],
  requiredCapabilities: readonly CrmRoutingCapability[],
  scope: { storeId: string; tenantId: string },
): CrmChannelRoutingReadModel["bot"] {
  const channelConnections = connections.filter(
    (connection) => connection.channel === channel,
  );
  const hasReadyConnection = channelConnections.some(
    (connection) =>
      resolveCrmConnectionRoute({
        channel,
        connection,
        connectionId: connection.id,
        requiredCapabilities,
        scope,
      }).ready,
  );
  if (hasReadyConnection) {
    return {
      blocked: null,
      connection: null,
      mode: "all_channel_connections",
      ready: true,
      requiredCapabilities,
    };
  }
  return {
    ...resolveCrmConnectionRoute({
      channel,
      connection: channelConnections[0] ?? null,
      connectionId: channelConnections[0]?.id ?? null,
      requiredCapabilities,
      scope,
    }),
    connection: null,
    mode: "all_channel_connections",
  };
}
