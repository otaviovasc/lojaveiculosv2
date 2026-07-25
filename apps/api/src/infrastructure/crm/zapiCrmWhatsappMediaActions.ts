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
import {
  fetchZapiWithRateLimitRetry,
  readRetryAfterSeconds,
  type ZapiRateLimitRetryOptions,
} from "./zapiCrmWhatsappRateLimit.js";

export async function sendZapiMedia(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendMediaInput,
  retryOptions: ZapiRateLimitRetryOptions = {},
) {
  const response = await fetchZapiWithRateLimitRetry(
    () =>
      fetchImpl(
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
      throw new CrmWhatsappGatewayError(
        `ZAPI send media failed with HTTP 429: ${summarize(text)}`,
        429,
        readRetryAfterSeconds(response.headers) ?? 1,
      );
    }
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
