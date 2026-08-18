import { crmMessagingChannels } from "../../ports/crmRoutingPolicyRepository.js";
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
          : (policy?.externalBotConnectionId ?? null);
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
