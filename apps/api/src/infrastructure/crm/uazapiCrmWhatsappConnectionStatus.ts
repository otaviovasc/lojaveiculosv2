import {
  buildUazapiUrl,
  fetchUazapi,
  parseJson,
  toUazapiProviderStatus,
  type UazapiCredentials,
  uazapiProviderResponseError,
} from "./uazapiCrmWhatsappGatewaySupport.js";

export async function readUazapiConnectionStatus(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
) {
  const response = await fetchUazapi(
    credentials,
    fetchImpl,
    buildUazapiUrl(credentials, "/instance/status"),
    {
      headers: {
        Accept: "application/json",
        token: credentials.instanceToken,
      },
      method: "GET",
    },
  );
  const payload = parseJson(await response.text());

  if (!response.ok) {
    throw uazapiProviderResponseError(
      response.status,
      "UAZAPI status",
      credentials.instanceToken,
    );
  }

  return toUazapiProviderStatus(payload);
}
