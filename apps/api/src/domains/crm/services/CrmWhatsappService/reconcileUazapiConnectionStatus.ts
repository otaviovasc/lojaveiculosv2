import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getUazapiConnectionSetupProvider } from "../CrmService/crmConnectionSetupSupport.js";
import { openUazapiSetupCredentials } from "./uazapiConnectionSetupSupport.js";
import { reconcileWhatsappConnectionStatus } from "./reconcileWhatsappConnectionStatus.js";

export async function reconcileUazapiConnectionStatus(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<"active" | "disconnected" | "unverified"> {
  return reconcileWhatsappConnectionStatus(
    {
      disappearedMessage: "Uazapi connection status target disappeared.",
      loadStatus: async () =>
        getUazapiConnectionSetupProvider(ports).validateStatus(
          await openUazapiSetupCredentials(connection, ports),
        ),
      provider: "uazapi",
      summary: "Reconciled uazapi connection status after webhook setup",
    },
    context,
    connection,
    ports,
  );
}
