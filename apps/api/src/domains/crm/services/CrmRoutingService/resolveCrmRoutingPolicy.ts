import { crmRoutingChannels } from "../../ports/crmRoutingPolicyRepository.js";
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
  const channels = crmRoutingChannels.map(
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
      const botMode = policy?.botMode ?? "disabled";
      if (botMode === "disabled") {
        return {
          bot: {
            blocked: {
              code: "route_disabled",
              message: "Bot routing is disabled for this channel.",
              remediation: "Enable inherited or explicit bot routing.",
            },
            connection: null,
            mode: botMode,
            ready: false,
            requiredCapabilities,
          },
          channel,
          storeDefault,
        };
      }
      const botConnectionId =
        botMode === "inherit_store_default"
          ? defaultConnectionId
          : (policy?.botConnectionId ?? null);
      return {
        bot: {
          ...resolveCrmConnectionRoute({
            channel,
            connection: botConnectionId
              ? (byId.get(botConnectionId) ?? null)
              : null,
            connectionId: botConnectionId,
            requiredCapabilities,
            scope,
          }),
          mode: botMode,
        },
        channel,
        storeDefault,
      };
    },
  );
  return { channels, ...scope };
}
