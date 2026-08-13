import {
  CrmConnectionSetupProviderError,
  type ZapiConnectionSetupProvider,
  type ZapiPairingResult,
  type ZapiSetupCredentials,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  isZapiProviderConnected,
  readString,
} from "./zapiCrmWhatsappGatewaySupport.js";
import {
  assertHttpsProviderUrl,
  assertProviderAccepted,
  normalizeBrazilianPairingPhone,
  readPairingCode,
  readQrDataUri,
  readQrResponse,
  readSetupResponse,
  readTimeoutMs,
  requestZapiSetup,
  requireCredential,
} from "./zapiCrmConnectionSetupSupport.js";

const DEFAULT_API_BASE_URL = "https://api.z-api.io";
const QR_EXPIRES_IN_SECONDS = 20;

export function createZapiCrmConnectionSetupProvider(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): ZapiConnectionSetupProvider {
  const clientToken = env.CRM_ZAPI_CLIENT_TOKEN?.trim();
  if (!clientToken) {
    throw new CrmConnectionSetupProviderError(
      "Z-API client authentication is not configured",
      "configuration_error",
    );
  }
  const apiBaseUrl =
    env.CRM_ZAPI_API_BASE_URL?.trim().replace(/\/+$/u, "") ||
    DEFAULT_API_BASE_URL;
  assertHttpsProviderUrl(apiBaseUrl);
  const timeoutMs = readTimeoutMs(env.CRM_ZAPI_REQUEST_TIMEOUT_MS);
  const resolveCredentials = (credentials: ZapiSetupCredentials) => ({
    apiBaseUrl,
    clientToken,
    instanceId: requireCredential(credentials.instanceId, "instance ID"),
    instanceToken: requireCredential(
      credentials.instanceToken,
      "instance token",
    ),
  });
  const request = (credentials: ZapiSetupCredentials, path: string) =>
    requestZapiSetup(
      resolveCredentials(credentials),
      path,
      "application/json",
      timeoutMs,
      fetchImpl,
      readSetupResponse,
    );

  return {
    async getPairingCode(credentials, phone) {
      const normalizedPhone = normalizeBrazilianPairingPhone(phone);
      if (!normalizedPhone) throw invalidPairingPhone();
      return readPairingResult(
        await request(credentials, `/phone-code/${normalizedPhone}`),
      );
    },
    async getQrCode(credentials) {
      const response = await requestZapiSetup(
        resolveCredentials(credentials),
        "/qr-code/image",
        "application/json,image/png,image/jpeg,*/*",
        timeoutMs,
        fetchImpl,
        readQrResponse,
      );
      const payload = response.payload;
      if (isZapiProviderConnected(payload)) throw pairingDisconnectRequired();
      assertProviderAccepted(payload);
      const dataUri = response.dataUri ?? readQrDataUri(payload);
      if (!dataUri && isPasskeyChallenge(payload.challenge)) {
        throw new CrmConnectionSetupProviderError(
          "Z-API requires another pairing method. Try connecting by phone.",
          "pairing_method_required",
        );
      }
      if (!dataUri) {
        throw invalidResponse("Z-API did not return a valid QR code");
      }
      return { dataUri, expiresInSeconds: QR_EXPIRES_IN_SECONDS };
    },
    async validateStatus(credentials) {
      const payload = await request(credentials, "/status");
      const hasConnected = typeof payload.connected === "boolean";
      const hasSmartphone = typeof payload.smartphoneConnected === "boolean";
      if (!hasConnected && !hasSmartphone) {
        throw invalidResponse("Z-API did not return a valid connection status");
      }
      return {
        connected: isZapiProviderConnected(payload),
        connectedPhone:
          readString(payload.connectedPhone) ??
          readString(payload.phone) ??
          readString(payload.number),
        smartphoneConnected: hasSmartphone
          ? (payload.smartphoneConnected as boolean)
          : null,
      };
    },
  };
}

function readPairingResult(
  payload: Record<string, unknown>,
): ZapiPairingResult {
  if (isZapiProviderConnected(payload)) throw pairingDisconnectRequired();
  assertProviderAccepted(payload);
  const code = readPairingCode(payload, [
    "value",
    "code",
    "phoneCode",
    "pairingCode",
  ]);
  if (code) return { code, kind: "code" };
  const challenge = readRecord(payload.challenge);
  const challengeValue = readString(challenge.challenge);
  if (!challengeValue) {
    throw invalidResponse("Z-API did not return pairing credentials");
  }
  return {
    challenge: {
      challenge: challengeValue,
      rpId: readString(challenge.rpId),
      timeoutMs:
        typeof challenge.timeout === "number" &&
        Number.isFinite(challenge.timeout)
          ? challenge.timeout
          : null,
    },
    kind: "challenge",
  };
}

function isPasskeyChallenge(value: unknown) {
  const challenge = readRecord(value);
  return Boolean(readString(challenge.challenge) && readString(challenge.rpId));
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pairingDisconnectRequired() {
  return new CrmConnectionSetupProviderError(
    "Disconnect the current WhatsApp device before starting a new pairing.",
    "pairing_disconnect_required",
  );
}

function invalidPairingPhone() {
  return new CrmConnectionSetupProviderError(
    "Z-API pairing phone must be a valid Brazilian number",
    "configuration_error",
  );
}

function invalidResponse(message: string) {
  return new CrmConnectionSetupProviderError(
    message,
    "invalid_provider_response",
  );
}
