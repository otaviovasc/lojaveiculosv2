import { CrmMessagingGatewayError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  buildInstanceUrl,
  fetchZapi,
  parseJson,
  requireProviderMessageId,
  type ZapiCredentials,
  zapiProviderResponseError,
} from "./zapiCrmWhatsappGatewaySupport.js";
import type { CrmMessagingSendTextInput } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  fetchZapiWithRateLimitRetry,
  readRetryAfterSeconds,
  type ZapiRateLimitRetryOptions,
} from "./zapiCrmWhatsappRateLimit.js";

export async function sendZapiText(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmMessagingSendTextInput,
  retryOptions: ZapiRateLimitRetryOptions = {},
) {
  const response = await fetchZapiWithRateLimitRetry(
    () =>
      fetchZapi(
        credentials,
        fetchImpl,
        `${buildInstanceUrl(credentials)}/send-text`,
        {
          body: JSON.stringify({
            message: input.text,
            ...(input.replyToMessageId
              ? { messageId: input.replyToMessageId }
              : {}),
            phone: input.phone,
          }),
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
        "ZAPI send text rate limited",
        429,
        readRetryAfterSeconds(response.headers),
      );
    }
    throw zapiProviderResponseError(response.status, "ZAPI send text");
  }

  return {
    externalId: requireProviderMessageId(payload, "ZAPI send text"),
    providerTimestamp: new Date(),
  };
}
