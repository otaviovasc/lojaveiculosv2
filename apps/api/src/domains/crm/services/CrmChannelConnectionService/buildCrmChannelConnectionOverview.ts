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
import { getCrmBillingQuotaGuard } from "../CrmService/crmConnectionSetupSupport.js";
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
  const getAllowance = getCrmBillingQuotaGuard(ports).getAllowance;
  if (!getAllowance) {
    throw new Error("Billing quota allowance resolver is unavailable.");
  }
  const allowance = await getAllowance({
    quotaKey: "crm_zapi",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
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
  return {
    allowance,
    availableSetups: availableSetups.filter((identity) => {
      if (configured.has(connectionIdentityKey(identity))) return false;
      if (identity.provider === "zapi") return true;
      return entitlements.includes("crm");
    }),
    connections,
  };
}
