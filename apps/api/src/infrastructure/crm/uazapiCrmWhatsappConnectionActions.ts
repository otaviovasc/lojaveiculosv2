import {
  buildUazapiUrl,
  ensureUazapiOk,
  fetchUazapi,
  parseJson,
  type UazapiCredentials,
  uazapiProviderResponseError,
} from "./uazapiCrmWhatsappGatewaySupport.js";

export async function disconnectUazapiConnection(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
): Promise<{ disconnected: true }> {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/instance/disconnect"),
    {
      body: JSON.stringify({}),
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
      "UAZAPI disconnect",
      credentials.instanceToken,
    );
  }
  ensureUazapiOk(payload, "UAZAPI disconnect", credentials.instanceToken);
  return { disconnected: true };
}
