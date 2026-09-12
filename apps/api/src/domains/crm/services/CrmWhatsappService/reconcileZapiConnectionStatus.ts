import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getZapiConnectionSetupProvider } from "../CrmService/crmConnectionSetupSupport.js";
import { openZapiSetupCredentials } from "./zapiWhatsappConnectionSetup.js";
import { reconcileWhatsappConnectionStatus } from "./reconcileWhatsappConnectionStatus.js";

export async function reconcileZapiConnectionStatus(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<"active" | "disconnected" | "unverified"> {
  return reconcileWhatsappConnectionStatus(
    {
      disappearedMessage: "Z-API connection status target disappeared.",
      loadStatus: async () =>
        getZapiConnectionSetupProvider(ports).validateStatus(
          await openZapiSetupCredentials(connection, ports),
        ),
      provider: "zapi",
      summary: "Reconciled Z-API connection status after webhook setup",
    },
    context,
    connection,
    ports,
  );
}
