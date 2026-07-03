import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  createZapiMediaBody,
  createZapiMediaEndpoint,
} from "./zapiCrmWhatsappMediaPayload.js";
import {
  buildInstanceUrl,
  createProviderMessageId,
  parseJson,
  summarize,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";
import type { CrmWhatsappSendMediaInput } from "../../domains/crm/ports/crmWhatsappGateway.js";

export async function sendZapiMedia(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendMediaInput,
) {
  const response = await fetchImpl(
    `${buildInstanceUrl(credentials)}${createZapiMediaEndpoint(input)}`,
    {
      body: JSON.stringify(createZapiMediaBody(input)),
      headers: {
        Accept: "application/json",
        "Client-Token": credentials.clientToken,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new CrmWhatsappGatewayError(
      `ZAPI send media failed with HTTP ${response.status}: ${summarize(text)}`,
    );
  }

  return {
    externalId: createProviderMessageId(payload),
    providerTimestamp: new Date(),
    raw: payload,
  };
}
