import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  connectionIdentityKey,
  setupProviderForConnection,
  type CrmChannelConnection,
} from "../../channelConnections/channelConnectionModels.js";
import type {
  CrmChannelConnectionOverview,
  CrmChannelConnectionSetupIdentity,
} from "../../channelConnections/connectionCreation.js";
import {
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";

const availableSetups = [
  { broker: "direct", channel: "whatsapp", provider: "zapi" },
  { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
  { broker: "composio", channel: "instagram", provider: "meta_cloud" },
] as const satisfies readonly CrmChannelConnectionSetupIdentity[];

export async function buildCrmChannelConnectionOverview(
  context: ServiceContext,
  ports: CrmServicePorts,
  connections: readonly CrmChannelConnection[],
): Promise<CrmChannelConnectionOverview> {
  const scope = requireCrmMessagingScope(context);
  const configured = new Set(
    connections
      .filter((connection) => connection.status !== "archived")
      .map(setupProviderForConnection)
      .filter((key): key is string => key !== null),
  );
  const entitlements =
    "entitlements" in context && Array.isArray(context.entitlements)
      ? context.entitlements
      : [];
  const activeZapiCount = connections.filter(
    (connection) =>
      connection.provider === "zapi" && connection.status !== "archived",
  ).length;
  return {
    allowance: {
      limit: 1,
      remaining: Math.max(0, 1 - activeZapiCount),
      used: activeZapiCount,
    },
    availableSetups: availableSetups.filter((identity) => {
      if (configured.has(connectionIdentityKey(identity))) return false;
      if (identity.provider === "zapi") return true;
      return entitlements.includes("crm");
    }),
    connections,
  };
}
