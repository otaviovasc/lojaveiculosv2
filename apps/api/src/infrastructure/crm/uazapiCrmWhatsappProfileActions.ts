import {
  buildUazapiUrl,
  ensureUazapiOk,
  fetchUazapi,
  parseJson,
  readString,
  type UazapiCredentials,
  uazapiProviderResponseError,
} from "./uazapiCrmWhatsappGatewaySupport.js";

/**
 * Resolves a contact profile photo URL through POST /chat/details. Uazapi
 * message webhooks do not always carry `profilePhoto`, so this is the
 * on-demand fallback mirroring the Z-API `profile-picture` seam. A contact
 * without a photo yields no `image`/`imagePreview` field and maps to null.
 */
export async function getUazapiProfilePhotoUrl(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: { phone: string },
): Promise<string | null> {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/chat/details"),
    {
      body: JSON.stringify({ number: input.phone, preview: false }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        token: credentials.instanceToken,
      },
      method: "POST",
    },
  );
  const payload = parseJson(await response.text());
  if (response.status === 404) return null;
  if (!response.ok) {
    throw uazapiProviderResponseError(
      response.status,
      "UAZAPI profile photo",
      credentials.instanceToken,
      payload,
    );
  }
  ensureUazapiOk(payload, "UAZAPI profile photo", credentials.instanceToken);
  return readString(payload.image) ?? readString(payload.imagePreview);
}
