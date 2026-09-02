import type { CrmMessagingSendMediaInput } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  buildUazapiUrl,
  ensureUazapiOk,
  fetchUazapi,
  parseJson,
  readString,
  requireUazapiMessageId,
  type UazapiCredentials,
  uazapiProviderResponseError,
} from "./uazapiCrmWhatsappGatewaySupport.js";
import type { UazapiAudioTranscoder } from "./uazapiCrmWhatsappAudioTranscode.js";
import { prepareUazapiMediaFile } from "./uazapiCrmWhatsappMediaSupport.js";

/**
 * Hydrates an inbound media URL via POST /message/download with
 * `return_link: true`. Returns null fields when the provider cannot produce a
 * link so ingestion can persist the message without media instead of failing.
 */
export async function downloadUazapiInboundMedia(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: { messageId: string },
): Promise<{ mediaUrl: string | null; mimeType: string | null }> {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/message/download"),
    {
      body: JSON.stringify({ id: input.messageId, return_link: true }),
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
      "UAZAPI inbound media download",
      credentials.instanceToken,
    );
  }
  ensureUazapiOk(
    payload,
    "UAZAPI inbound media download",
    credentials.instanceToken,
  );
  const fileURL = readString(payload.fileURL);
  if (!fileURL) return { mediaUrl: null, mimeType: null };
  return {
    mediaUrl: fileURL,
    mimeType: readString(payload.mimetype) ?? readString(payload.mimeType),
  };
}

export type UazapiMediaActionOptions = {
  transcodeAudioToMp3?: UazapiAudioTranscoder;
};

export async function sendUazapiMedia(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmMessagingSendMediaInput,
  options: UazapiMediaActionOptions = {},
) {
  const prepared = await prepareUazapiMediaFile(
    credentials,
    fetchImpl,
    input,
    options,
  );
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/send/media"),
    {
      body: JSON.stringify({
        number: input.phone,
        type: input.mediaType,
        file: prepared.file,
        ...(input.caption ? { text: input.caption } : {}),
        ...(input.mediaType === "document"
          ? { docName: input.fileName ?? "documento.pdf" }
          : {}),
        ...(prepared.mimetype ? { mimetype: prepared.mimetype } : {}),
        ...(input.mediaType === "audio"
          ? { async: false }
          : input.asyncProcessing !== undefined
            ? { async: input.asyncProcessing }
            : {}),
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
      "UAZAPI send media",
      credentials.instanceToken,
    );
  }
  ensureUazapiOk(payload, "UAZAPI send media", credentials.instanceToken);

  return {
    externalId: requireUazapiMessageId(payload, "UAZAPI send media"),
    providerTimestamp: new Date(),
  };
}
