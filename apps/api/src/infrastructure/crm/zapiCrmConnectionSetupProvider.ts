import {
  CrmConnectionSetupProviderError,
  type ZapiConnectionSetupProvider,
  type ZapiPairingResult,
  type ZapiSetupCredentials,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  buildInstanceUrl,
  parseJson,
  readString,
} from "./zapiCrmWhatsappGatewaySupport.js";

const DEFAULT_API_BASE_URL = "https://api.z-api.io";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;
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

  const request = (
    credentials: ZapiSetupCredentials,
    path: string,
  ): Promise<Record<string, unknown>> =>
    requestZapi(
      {
        apiBaseUrl,
        clientToken,
        instanceId: requireCredential(credentials.instanceId, "instance ID"),
        instanceToken: requireCredential(
          credentials.instanceToken,
          "instance token",
        ),
      },
      path,
      timeoutMs,
      fetchImpl,
    );

  return {
    async getPairingCode(credentials, phone) {
      const normalizedPhone = phone.replace(/\D/gu, "");
      if (!/^\d{8,15}$/u.test(normalizedPhone)) {
        throw new CrmConnectionSetupProviderError(
          "Z-API pairing phone is invalid",
          "configuration_error",
        );
      }
      return readPairingResult(
        await request(credentials, `/phone-code/${normalizedPhone}`),
      );
    },
    async getQrCode(credentials) {
      const payload = await request(credentials, "/qr-code");
      const dataUri = normalizeQrDataUri(readString(payload.value));
      if (!dataUri) {
        throw invalidResponse("Z-API did not return a valid QR code");
      }
      return { dataUri, expiresInSeconds: QR_EXPIRES_IN_SECONDS };
    },
    async validateStatus(credentials) {
      const payload = await request(credentials, "/status");
      if (typeof payload.connected !== "boolean") {
        throw invalidResponse("Z-API did not return a valid connection status");
      }
      return {
        connected: payload.connected,
        connectedPhone:
          readString(payload.connectedPhone) ??
          readString(payload.phone) ??
          readString(payload.number),
        smartphoneConnected:
          typeof payload.smartphoneConnected === "boolean"
            ? payload.smartphoneConnected
            : null,
      };
    },
  };
}

function normalizeQrDataUri(value: string | null) {
  if (!value) return null;
  const prefix = "data:image/png;base64,";
  if (!value.toLowerCase().startsWith(prefix)) return null;
  const encoded = value.slice(prefix.length).replace(/\s+/gu, "");
  if (!encoded || !/^[a-z0-9+/_-]+={0,2}$/iu.test(encoded)) return null;
  return `${prefix}${encoded}`;
}

async function requestZapi(
  credentials: {
    apiBaseUrl: string;
    clientToken: string;
    instanceId: string;
    instanceToken: string;
  },
  path: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${buildInstanceUrl(credentials)}${path}`,
      {
        headers: {
          Accept: "application/json",
          "Client-Token": credentials.clientToken,
        },
        method: "GET",
        redirect: "error",
        signal: controller.signal,
      },
    );
    const payload = parseJson(await response.text());
    if (!response.ok) {
      throw new CrmConnectionSetupProviderError(
        `Z-API setup request was rejected with HTTP ${response.status}`,
        response.status === 429 ? "rate_limited" : "provider_rejected",
        response.status,
        response.status === 429 ? readRetryAfter(response.headers) : undefined,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof CrmConnectionSetupProviderError) throw error;
    if (controller.signal.aborted) {
      throw new CrmConnectionSetupProviderError(
        "Z-API setup request timed out",
        "timeout",
      );
    }
    throw new CrmConnectionSetupProviderError(
      "Z-API setup request failed before receiving a response",
      "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function readPairingResult(
  payload: Record<string, unknown>,
): ZapiPairingResult {
  const code = readString(payload.value);
  if (code) return { code, kind: "code" };

  const challenge =
    payload.challenge &&
    typeof payload.challenge === "object" &&
    !Array.isArray(payload.challenge)
      ? (payload.challenge as Record<string, unknown>)
      : {};
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

function requireCredential(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new CrmConnectionSetupProviderError(
      `Z-API ${label} is required`,
      "configuration_error",
    );
  }
  return normalized;
}

function readTimeoutMs(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
}

function readRetryAfter(headers: Headers) {
  const value = Number(headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 1;
}

function invalidResponse(message: string) {
  return new CrmConnectionSetupProviderError(
    message,
    "invalid_provider_response",
  );
}

function assertHttpsProviderUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return;
  } catch {
    // Mapped to the stable setup configuration error below.
  }
  throw new CrmConnectionSetupProviderError(
    "Z-API base URL must be HTTPS and contain no embedded credentials",
    "configuration_error",
  );
}
