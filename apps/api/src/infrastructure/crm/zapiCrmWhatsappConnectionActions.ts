import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  buildInstanceUrl,
  fetchZapi,
  parseJson,
  type ZapiCredentials,
  zapiProviderResponseError,
} from "./zapiCrmWhatsappGatewaySupport.js";

export async function disconnectZapiConnection(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
): Promise<{ disconnected: true }> {
  const response = await fetchZapi(
    credentials,
    fetchImpl,
    `${buildInstanceUrl(credentials)}/disconnect`,
    {
      headers: {
        Accept: "application/json",
        "Client-Token": credentials.clientToken,
      },
      method: "GET",
      redirect: "manual",
    },
  );
  const payload = parseJson(await response.text());
  if (!response.ok) {
    throw zapiProviderResponseError(response.status, "ZAPI disconnect");
  }
  if (payload.value !== true) {
    throw new CrmMessagingGatewayError(
      "ZAPI did not confirm the WhatsApp disconnection",
      502,
      undefined,
      "provider_rejected",
    );
  }
  return { disconnected: true };
}
