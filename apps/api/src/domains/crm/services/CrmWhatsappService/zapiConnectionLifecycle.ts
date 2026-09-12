import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  disconnectWhatsappConnection,
  refreshWhatsappConnectionStatus,
  type WhatsappConnectionLifecycleInput,
  type WhatsappConnectionLifecycleProvider,
} from "./whatsappConnectionLifecycleSupport.js";

const zapiLifecycle: WhatsappConnectionLifecycleProvider = {
  actorErrorMessage:
    "Z-API connection management requires an authenticated store user.",
  provider: "zapi",
  summaries: {
    disconnect: "Disconnected WhatsApp from the Z-API instance",
    refreshStatus: "Refreshed Z-API connection status",
  },
};

export type ZapiConnectionLifecycleInput = WhatsappConnectionLifecycleInput;

export async function disconnectZapiConnection(
  context: ServiceContext,
  input: ZapiConnectionLifecycleInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  return disconnectWhatsappConnection(zapiLifecycle, context, input, ports);
}

export async function refreshZapiConnectionStatus(
  context: ServiceContext,
  input: ZapiConnectionLifecycleInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  return refreshWhatsappConnectionStatus(zapiLifecycle, context, input, ports);
}
