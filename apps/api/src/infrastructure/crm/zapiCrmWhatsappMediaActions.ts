import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  createZapiMediaBody,
  createZapiMediaEndpoint,
} from "./zapiCrmWhatsappMediaPayload.js";
import {
  buildInstanceUrl,
  fetchZapi,
  parseJson,
  requireProviderMessageId,
  type ZapiCredentials,
  zapiProviderResponseError,
} from "./zapiCrmWhatsappGatewaySupport.js";
import type { CrmMessagingSendMediaInput } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  fetchZapiWithRateLimitRetry,
  readRetryAfterSeconds,
  type ZapiRateLimitRetryOptions,
} from "./zapiCrmWhatsappRateLimit.js";

export async function sendZapiMedia(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmMessagingSendMediaInput,
  retryOptions: ZapiRateLimitRetryOptions = {},
) {
  const response = await fetchZapiWithRateLimitRetry(
    () =>
      fetchZapi(
        credentials,
        fetchImpl,
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
      ),
    retryOptions,
  );
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    if (response.status === 429) {
      throw new CrmMessagingGatewayError(
        "ZAPI send media failed with HTTP 429",
        429,
        readRetryAfterSeconds(response.headers) ?? 1,
      );
    }
    throw zapiProviderResponseError(response.status, "ZAPI send media");
  }

  return {
    externalId: requireProviderMessageId(payload, "ZAPI send media"),
    providerTimestamp: new Date(),
  };
}
