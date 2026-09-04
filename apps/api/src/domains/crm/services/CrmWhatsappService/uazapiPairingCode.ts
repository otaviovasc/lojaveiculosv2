import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmConnectionSetupProviderError } from "../../ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { whatsappPhoneDigits } from "../../whatsapp/whatsappPhone.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { recordCrmServiceMutation } from "../CrmMessagingService/serviceSupport.js";
import {
  loadUazapiSetupTarget,
  requestCodeForDisconnectedInstance,
  runPostPairingWebhookSetup,
  runUazapiProviderOperation,
  setupUazapiPairingAudit,
} from "./uazapiConnectionSetupSupport.js";
import type { RequestUazapiPairingQrInput } from "./uazapiPairingQr.js";

/** CRM-side validity window for an issued uazapi pairing code. */
const UAZAPI_PAIRING_CODE_TTL_SECONDS = 300;

export type RequestUazapiPairingCodeInput = RequestUazapiPairingQrInput & {
  phone?: string;
};

export async function requestUazapiPairingCode(
  context: ServiceContext,
  input: RequestUazapiPairingCodeInput,
  ports: CrmServicePorts,
) {
  const { connection, credentials } = await loadUazapiSetupTarget(
    context,
    input.connectionId,
    ports,
  );
  const phone = resolvePairingPhone(input.phone, connection);
  const result = await recordCrmServiceMutation(
    context,
    setupUazapiPairingAudit(
      "crm.provider.uazapi.connection.pairing_code",
      connection.id,
    ),
    async () => {
      const pairing = await runUazapiProviderOperation(
        context,
        connection.id,
        "pairing_code",
        () => requestCodeForDisconnectedInstance(credentials, phone, ports),
      );
      return {
        expiresAt: new Date(
          Date.now() + UAZAPI_PAIRING_CODE_TTL_SECONDS * 1_000,
        ).toISOString(),
        ...(pairing.kind === "code" ? { code: pairing.code } : {}),
        requested: true,
      };
    },
  );
  await runPostPairingWebhookSetup(context, connection.id, input, ports);
  return result;
}

function resolvePairingPhone(
  phone: string | undefined,
  connection: CrmConnection,
) {
  const candidate = phone?.trim() || connection.phone?.trim() || "";
  const digits = whatsappPhoneDigits(candidate);
  if (digits.length < 8) {
    throw new CrmConnectionSetupProviderError(
      "A phone number is required to request an uazapi pairing code.",
      "pairing_method_required",
    );
  }
  return digits;
}
