import {
  buildUazapiUrl,
  ensureUazapiOk,
  fetchUazapi,
  parseJson,
  requireUazapiMessageId,
  type UazapiCredentials,
  uazapiProviderResponseError,
} from "./uazapiCrmWhatsappGatewaySupport.js";
import type { CrmMessagingSendTextInput } from "../../domains/crm/ports/crmMessagingGateway.js";

export async function sendUazapiText(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmMessagingSendTextInput,
) {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/send/text"),
    {
      body: JSON.stringify({
        number: input.phone,
        text: input.text,
        ...(input.replyToMessageId ? { replyid: input.replyToMessageId } : {}),
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token: credentials.instanceToken,
      },
      method: "POST",
    },
  );
  const payload = parseJson(await response.text());

  if (!response.ok) {
    throw uazapiProviderResponseError(
      response.status,
      "UAZAPI send text",
      credentials.instanceToken,
    );
  }
  ensureUazapiOk(payload, "UAZAPI send text", credentials.instanceToken);

  return {
    externalId: requireUazapiMessageId(payload, "UAZAPI send text"),
    providerTimestamp: new Date(),
  };
}
