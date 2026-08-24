import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { BillingContractUnavailableError } from "../../../billing/ports/billingQuotaGuard.js";
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
  let allowance = { limit: 0, remaining: 0, used: 0 };
  let billingState: CrmChannelConnectionOverview["billingState"] = {
    code: null,
    status: "available",
  };
  try {
    allowance = await getAllowance({
      quotaKey: "crm_zapi",
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
  } catch (error) {
    if (!(error instanceof BillingContractUnavailableError)) throw error;
    billingState = {
      code: "BILLING_CONTRACT_UNAVAILABLE",
      status: "unavailable",
    };
  }
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
    billingState,
    connections,
  };
}
