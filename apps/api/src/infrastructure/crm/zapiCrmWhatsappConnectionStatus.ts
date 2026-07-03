import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  buildInstanceUrl,
  parseJson,
  summarize,
  toProviderStatus,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";

export async function readZapiConnectionStatus(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
) {
  const response = await fetchImpl(`${buildInstanceUrl(credentials)}/status`, {
    headers: {
      Accept: "application/json",
      "Client-Token": credentials.clientToken,
    },
    method: "GET",
  });
  const text = await response.text();

  if (!response.ok) {
    throw new CrmWhatsappGatewayError(
      `ZAPI status failed with HTTP ${response.status}: ${summarize(text)}`,
    );
  }

  return toProviderStatus(parseJson(text));
}
