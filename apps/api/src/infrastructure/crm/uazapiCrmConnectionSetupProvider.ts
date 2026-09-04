import {
  CrmConnectionSetupProviderError,
  type UazapiConnectionSetupProvider,
  type UazapiSetupCredentials,
  type ZapiPairingResult,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  normalizeBrazilianPairingPhone,
  readQrDataUri,
} from "./zapiCrmConnectionSetupSupport.js";
import {
  readRecord,
  readString,
  readUazapiStatusPayload,
  UAZAPI_DEFAULT_BASE_URL,
  type UazapiCredentials,
  normalizeUazapiBaseUrl,
} from "./uazapiCrmWhatsappGatewaySupport.js";
import {
  readUazapiTimeoutMs,
  requestUazapiSetup,
  requireUazapiCredential,
} from "./uazapiCrmConnectionSetupSupport.js";

const QR_EXPIRES_IN_SECONDS = 60;

export function createUazapiCrmConnectionSetupProvider(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): UazapiConnectionSetupProvider {
  const timeoutMs = readUazapiTimeoutMs(env.CRM_UAZAPI_REQUEST_TIMEOUT_MS);
  const resolveCredentials = (
    credentials: UazapiSetupCredentials,
  ): UazapiCredentials => ({
    apiBaseUrl: normalizeSetupBaseUrl(
      credentials.apiBaseUrl?.trim() ||
        env.CRM_UAZAPI_BASE_URL?.trim() ||
        UAZAPI_DEFAULT_BASE_URL,
    ),
    instanceId: requireUazapiCredential(credentials.instanceId, "instance ID"),
    instanceToken: requireUazapiCredential(
      credentials.instanceToken,
      "instance token",
    ),
    requestTimeoutMs: timeoutMs,
  });

  return {
    async getQrCode(credentials) {
      const resolved = resolveCredentials(credentials);
      const connectPayload = await requestUazapiSetup(
        resolved,
        "/instance/connect",
        { body: {}, method: "POST" },
        timeoutMs,
        fetchImpl,
      );
      const dataUri =
        readQrDataUri(readRecord(connectPayload.instance)) ??
        readQrDataUri(connectPayload) ??
        (await readStatusQrDataUri(resolved, timeoutMs, fetchImpl));
      if (!dataUri) {
        throw invalidResponse("UAZAPI did not return a valid QR code");
      }
      return { dataUri, expiresInSeconds: QR_EXPIRES_IN_SECONDS };
    },
    async getPairingCode(credentials, phone) {
      const normalizedPhone = normalizeBrazilianPairingPhone(phone);
      if (!normalizedPhone) throw invalidPairingPhone();
      const resolved = resolveCredentials(credentials);
      const connectPayload = await requestUazapiSetup(
        resolved,
        "/instance/connect",
        { body: { phone: normalizedPhone }, method: "POST" },
        timeoutMs,
        fetchImpl,
      );
      const paircode =
        readPaircode(connectPayload) ??
        (await readStatusPaircode(resolved, timeoutMs, fetchImpl));
      if (!paircode) {
        throw invalidResponse("UAZAPI did not return a pairing code");
      }
      const result: ZapiPairingResult = { code: paircode, kind: "code" };
      return result;
    },
    async validateStatus(credentials) {
      const resolved = resolveCredentials(credentials);
      const payload = await requestUazapiSetup(
        resolved,
        "/instance/status",
        { method: "GET" },
        timeoutMs,
        fetchImpl,
      );
      const status = readUazapiStatusPayload(payload);
      if (status.instanceStatus === null && status.loggedIn === null) {
        throw invalidResponse(
          "UAZAPI did not return a valid connection status",
        );
      }
      return {
        connected: status.connected,
        connectedPhone: status.connectedPhone,
        smartphoneConnected: status.loggedIn,
      };
    },
  };
}

async function readStatusQrDataUri(
  credentials: UazapiCredentials,
  timeoutMs: number,
  fetchImpl: typeof fetch,
) {
  const payload = await requestUazapiSetup(
    credentials,
    "/instance/status",
    { method: "GET" },
    timeoutMs,
    fetchImpl,
  );
  return readQrDataUri(readRecord(payload.instance)) ?? readQrDataUri(payload);
}

async function readStatusPaircode(
  credentials: UazapiCredentials,
  timeoutMs: number,
  fetchImpl: typeof fetch,
) {
  const payload = await requestUazapiSetup(
    credentials,
    "/instance/status",
    { method: "GET" },
    timeoutMs,
    fetchImpl,
  );
  return readPaircode(payload);
}

function readPaircode(payload: Record<string, unknown>) {
  return (
    readString(readRecord(payload.instance).paircode) ??
    readString(payload.paircode)
  );
}

function normalizeSetupBaseUrl(value: string) {
  try {
    return normalizeUazapiBaseUrl(value);
  } catch {
    throw new CrmConnectionSetupProviderError(
      "UAZAPI base URL must be an http(s) URL without embedded credentials",
      "configuration_error",
    );
  }
}

function invalidPairingPhone() {
  return new CrmConnectionSetupProviderError(
    "UAZAPI pairing phone must be a valid Brazilian number",
    "configuration_error",
  );
}

function invalidResponse(message: string) {
  return new CrmConnectionSetupProviderError(
    message,
    "invalid_provider_response",
  );
}
