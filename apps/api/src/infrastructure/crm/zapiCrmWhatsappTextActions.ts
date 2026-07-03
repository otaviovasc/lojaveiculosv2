import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  buildInstanceUrl,
  createProviderMessageId,
  parseJson,
  summarize,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";
import type { CrmWhatsappSendTextInput } from "../../domains/crm/ports/crmWhatsappGateway.js";

export async function sendZapiText(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendTextInput,
) {
  const response = await fetchImpl(
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
  );
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new CrmWhatsappGatewayError(
      `ZAPI send text failed with HTTP ${response.status}: ${summarize(text)}`,
    );
  }

  return {
    externalId: createProviderMessageId(payload),
    providerTimestamp: new Date(),
    raw: payload,
  };
}
