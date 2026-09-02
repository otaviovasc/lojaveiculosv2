import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { recordCrmServiceMutation } from "../CrmMessagingService/serviceSupport.js";
import {
  loadUazapiSetupTarget,
  requestQrForDisconnectedInstance,
  runPostPairingWebhookSetup,
  runUazapiProviderOperation,
  setupUazapiPairingAudit,
} from "./uazapiConnectionSetupSupport.js";

export type RequestUazapiPairingQrInput = {
  connectionId: string;
  webhookSetupTarget?: {
    basePath: string;
    canonicalApiOrigin: string;
  };
};

export async function requestUazapiPairingQr(
  context: ServiceContext,
  input: RequestUazapiPairingQrInput,
  ports: CrmServicePorts,
) {
  const { connection, credentials } = await loadUazapiSetupTarget(
    context,
    input.connectionId,
    ports,
  );
  const result = await recordCrmServiceMutation(
    context,
    setupUazapiPairingAudit(
      "crm.provider.uazapi.connection.pairing_qr",
      connection.id,
    ),
    async () => {
      const qr = await runUazapiProviderOperation(
        context,
        connection.id,
        "pairing_qr",
        () => requestQrForDisconnectedInstance(credentials, ports),
      );
      return {
        expiresAt: new Date(
          Date.now() + qr.expiresInSeconds * 1_000,
        ).toISOString(),
        qrCode: qr.dataUri,
      };
    },
  );
  await runPostPairingWebhookSetup(context, connection.id, input, ports);
  return result;
}
