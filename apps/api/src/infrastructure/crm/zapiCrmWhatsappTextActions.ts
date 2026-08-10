import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  buildInstanceUrl,
  createProviderMessageId,
  fetchZapi,
  parseJson,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";
import type { CrmWhatsappSendTextInput } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  fetchZapiWithRateLimitRetry,
  readRetryAfterSeconds,
  type ZapiRateLimitRetryOptions,
} from "./zapiCrmWhatsappRateLimit.js";

export async function sendZapiText(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendTextInput,
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
      throw new CrmWhatsappGatewayError(
        "ZAPI send text rate limited",
        429,
        readRetryAfterSeconds(response.headers),
      );
    }
    throw new CrmWhatsappGatewayError(
      `ZAPI send text failed with HTTP ${response.status}`,
    );
  }

  return {
    externalId: createProviderMessageId(payload),
    providerTimestamp: new Date(),
  };
}
