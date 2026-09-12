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
import { CRM_WHATSAPP_CONNECTION_LIMIT } from "../../channelConnections/connectionCreation.js";
import {
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";

const availableSetups = [
  { broker: "direct", channel: "whatsapp", provider: "zapi" },
  { broker: "direct", channel: "whatsapp", provider: "uazapi" },
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
  const activeWhatsappCount = connections.filter(
    (connection) =>
      connection.channel === "whatsapp" && connection.status !== "archived",
  ).length;
  return {
    allowance: {
      limit: CRM_WHATSAPP_CONNECTION_LIMIT,
      remaining: Math.max(
        0,
        CRM_WHATSAPP_CONNECTION_LIMIT - activeWhatsappCount,
      ),
      used: activeWhatsappCount,
    },
    availableSetups: availableSetups.filter((identity) => {
      if (
        identity.provider !== "uazapi" &&
        configured.has(connectionIdentityKey(identity))
      )
        return false;
      if (identity.provider === "zapi") return true;
      if (identity.provider === "uazapi") {
        return activeWhatsappCount < CRM_WHATSAPP_CONNECTION_LIMIT;
      }
      return entitlements.includes("crm");
    }),
    connections,
  };
}
