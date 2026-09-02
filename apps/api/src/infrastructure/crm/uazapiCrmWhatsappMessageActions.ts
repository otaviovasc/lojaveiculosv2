import type {
  CrmMessageActionResult,
  CrmWhatsappDeleteMessageInput,
  CrmWhatsappDeleteMessageResult,
  CrmWhatsappRemoveReactionInput,
  CrmWhatsappSendReactionInput,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  buildUazapiUrl,
  ensureUazapiOk,
  fetchUazapi,
  parseJson,
  readUazapiMessageId,
  type UazapiCredentials,
  uazapiProviderResponseError,
} from "./uazapiCrmWhatsappGatewaySupport.js";

export async function deleteUazapiMessage(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappDeleteMessageInput,
): Promise<CrmWhatsappDeleteMessageResult> {
  await postUazapiMessageAction(
    credentials,
    fetchImpl,
    "/message/delete",
    { id: input.messageId },
    "UAZAPI delete message",
  );
  return { deleted: true };
}

export async function sendUazapiReaction(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendReactionInput,
): Promise<CrmMessageActionResult> {
  return postUazapiReaction(credentials, fetchImpl, input, input.reaction);
}

export async function removeUazapiReaction(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappRemoveReactionInput,
): Promise<CrmMessageActionResult> {
  return postUazapiReaction(credentials, fetchImpl, input, "");
}

async function postUazapiReaction(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: { messageId: string; phone: string },
  emoji: string,
): Promise<CrmMessageActionResult> {
  const payload = await postUazapiMessageAction(
    credentials,
    fetchImpl,
    "/message/react",
    { id: input.messageId, number: input.phone, text: emoji },
    "UAZAPI message reaction",
  );
  return {
    externalId: readUazapiMessageId(payload) ?? input.messageId,
    providerTimestamp: new Date(),
  };
}

export async function markUazapiMessagesRead(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  messageIds: readonly string[],
): Promise<{ markedRead: true }> {
  await postUazapiMessageAction(
    credentials,
    fetchImpl,
    "/message/markread",
    { id: [...messageIds] },
    "UAZAPI mark read",
  );
  return { markedRead: true };
}

async function postUazapiMessageAction(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  path: string,
  body: Record<string, unknown>,
  label: string,
) {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, path),
    {
      body: JSON.stringify(body),
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
      label,
      credentials.instanceToken,
    );
  }
  ensureUazapiOk(payload, label, credentials.instanceToken);
  return payload;
}
