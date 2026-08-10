import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  buildInstanceUrl,
  fetchZapi,
  parseJson,
  toProviderStatus,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";

export async function readZapiConnectionStatus(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
) {
  const response = await fetchZapi(
    credentials,
    fetchImpl,
    `${buildInstanceUrl(credentials)}/status`,
    {
      headers: {
        Accept: "application/json",
        "Client-Token": credentials.clientToken,
      },
      method: "GET",
    },
  );
  const text = await response.text();

  if (!response.ok) {
    throw new CrmWhatsappGatewayError(
      `ZAPI status failed with HTTP ${response.status}`,
    );
  }

  return toProviderStatus(parseJson(text));
}
