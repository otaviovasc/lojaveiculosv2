import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  disconnectWhatsappConnection,
  refreshWhatsappConnectionStatus,
  type WhatsappConnectionLifecycleInput,
  type WhatsappConnectionLifecycleProvider,
} from "./whatsappConnectionLifecycleSupport.js";

const uazapiLifecycle: WhatsappConnectionLifecycleProvider = {
  actorErrorMessage:
    "Uazapi connection management requires an authenticated store user.",
  provider: "uazapi",
  summaries: {
    disconnect: "Disconnected WhatsApp from the uazapi instance",
    refreshStatus: "Refreshed uazapi connection status",
  },
};

export type UazapiConnectionLifecycleInput = WhatsappConnectionLifecycleInput;

export async function disconnectUazapiConnection(
  context: ServiceContext,
  input: UazapiConnectionLifecycleInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  return disconnectWhatsappConnection(uazapiLifecycle, context, input, ports);
}

export async function refreshUazapiConnectionStatus(
  context: ServiceContext,
  input: UazapiConnectionLifecycleInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  return refreshWhatsappConnectionStatus(
    uazapiLifecycle,
    context,
    input,
    ports,
  );
}
