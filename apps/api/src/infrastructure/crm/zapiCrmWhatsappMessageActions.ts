import {
  CrmMessagingGatewayError,
  type CrmWhatsappDeleteMessageInput,
  type CrmWhatsappDeleteMessageResult,
  type CrmMessageActionResult,
  type CrmWhatsappRemoveReactionInput,
  type CrmWhatsappSendReactionInput,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  buildInstanceUrl,
  fetchZapi,
  parseJson,
  requireProviderMessageId,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";

export async function deleteZapiMessage(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappDeleteMessageInput,
): Promise<CrmWhatsappDeleteMessageResult> {
  const params = new URLSearchParams({
    messageId: input.messageId,
    owner: String(input.owner),
    phone: input.phone,
  });
  const response = await fetchZapi(
    credentials,
    fetchImpl,
    `${buildInstanceUrl(credentials)}/messages?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "Client-Token": credentials.clientToken,
      },
      method: "DELETE",
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new CrmMessagingGatewayError(
      `ZAPI delete message failed with HTTP ${response.status}`,
    );
  }
  parseJson(text);
  return { deleted: true };
}

export async function sendZapiReaction(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendReactionInput,
): Promise<CrmMessageActionResult> {
  return postZapiMessageAction(
    credentials,
    fetchImpl,
    "/send-reaction",
    {
      messageId: input.messageId,
      phone: input.phone,
      reaction: input.reaction,
    },
    "ZAPI send reaction",
  );
}

export async function removeZapiReaction(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappRemoveReactionInput,
): Promise<CrmMessageActionResult> {
  return postZapiMessageAction(
    credentials,
    fetchImpl,
    "/send-remove-reaction",
    {
      messageId: input.messageId,
      phone: input.phone,
    },
    "ZAPI remove reaction",
  );
}

async function postZapiMessageAction(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  path: string,
  body: Record<string, unknown>,
  label: string,
) {
  const response = await fetchZapi(
    credentials,
    fetchImpl,
    `${buildInstanceUrl(credentials)}${path}`,
    {
      body: JSON.stringify(body),
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
    throw new CrmMessagingGatewayError(
      `${label} failed with HTTP ${response.status}`,
    );
  }
  return {
    externalId: requireProviderMessageId(payload, label),
    providerTimestamp: new Date(),
  };
}
