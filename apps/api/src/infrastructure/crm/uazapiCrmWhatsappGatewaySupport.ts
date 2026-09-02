import {
  CrmMessagingGatewayError,
  type CrmMessagingProviderStatus,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
export { resolveUazapiCredentials } from "./uazapiCrmWhatsappCredentials.js";

export {
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
};

export const UAZAPI_DEFAULT_BASE_URL = "https://free.uazapi.com";
export const UAZAPI_DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const UAZAPI_MAX_REQUEST_TIMEOUT_MS = 60_000;

export type UazapiCredentials = {
  apiBaseUrl: string;
  instanceId: string;
  instanceToken: string;
  requestTimeoutMs?: number;
};

/**
 * Normalizes a per-instance uazapi base URL to its origin. Only http/https
 * are accepted so instance tokens are never sent to arbitrary schemes.
 */
export function normalizeUazapiBaseUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl.trim());
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    ) {
      return url.origin;
    }
  } catch {
    // Mapped to the stable configuration error below.
  }
  throw new CrmMessagingGatewayError(
    "UAZAPI base URL must be an http(s) URL without embedded credentials",
    409,
    undefined,
    "configuration_error",
  );
}

export function buildUazapiUrl(credentials: UazapiCredentials, path: string) {
  return `${normalizeUazapiBaseUrl(credentials.apiBaseUrl)}${path}`;
}

/** Redact an instance token for safe logging — keeps the first 4 chars. */
export function redactUazapiToken(token?: string) {
  return token ? `${token.slice(0, 4)}…[redacted]` : "[absent]";
}

export function redactUazapiTokenInText(text: string, token?: string) {
  return token ? text.split(token).join(redactUazapiToken(token)) : text;
}

export async function fetchUazapi(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    credentials.requestTimeoutMs ?? UAZAPI_DEFAULT_REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch {
    throw new CrmMessagingGatewayError(
      controller.signal.aborted
        ? "UAZAPI request timed out"
        : "UAZAPI request failed before receiving a response",
      502,
      undefined,
      controller.signal.aborted ? "timeout" : "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJson(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Uazapi answers failed sends with HTTP 200 and `{ error: true, message }`
 * (for example on a disconnected instance), so the body must always be
 * inspected, not just the status code.
 */
export function ensureUazapiOk(
  payload: Record<string, unknown>,
  label: string,
  token?: string,
) {
  if (payload.error !== true) return;
  const raw =
    readString(payload.message) ??
    readString(payload.response) ??
    "provider returned an error";
  throw new CrmMessagingGatewayError(
    redactUazapiTokenInText(`${label} failed: ${raw}`, token),
    502,
    undefined,
    "provider_rejected",
  );
}

/**
 * Reads the outbound provider message id. Only the WhatsApp message id
 * (`messageid`/`messageId`) is valid evidence; the internal `id` (`r` + hex)
 * must never be persisted as an external id.
 */
export function readUazapiMessageId(payload: Record<string, unknown>) {
  const messageId =
    readString(payload.messageid) ?? readString(payload.messageId);
  return messageId && messageId.length <= 512 ? messageId : null;
}

export function requireUazapiMessageId(
  payload: Record<string, unknown>,
  label: string,
) {
  const messageId = readUazapiMessageId(payload);
  if (messageId) return messageId;

  throw new CrmMessagingGatewayError(
    `${label} returned without a WhatsApp message id; the outcome is indeterminate`,
    502,
    undefined,
    "request_failed",
  );
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export type UazapiInstanceStatusPayload = {
  connected: boolean;
  connectedPhone: string | null;
  instanceStatus: string | null;
  loggedIn: boolean | null;
  profileName: string | null;
  profilePicUrl: string | null;
};

/** Maps the GET /instance/status payload to a stable shape. */
export function readUazapiStatusPayload(
  payload: Record<string, unknown>,
): UazapiInstanceStatusPayload {
  const instance = readRecord(payload.instance);
  const status = readRecord(payload.status);
  const jid = readRecord(status.jid);
  const instanceStatus = readString(instance.status);
  const connected = status.connected === true || instanceStatus === "connected";
  const loggedIn =
    typeof status.loggedIn === "boolean" ? status.loggedIn : null;
  return {
    connected,
    connectedPhone:
      readString(jid.user) ?? stripWhatsappJid(readString(instance.owner)),
    instanceStatus,
    loggedIn,
    profileName: readString(instance.profileName),
    profilePicUrl: readString(instance.profilePicUrl),
  };
}

export function stripWhatsappJid(value: string | null) {
  if (!value) return null;
  return value.split("@", 1)[0]?.trim() || null;
}

export function toUazapiProviderStatus(
  payload: Record<string, unknown>,
): CrmMessagingProviderStatus {
  const status = readUazapiStatusPayload(payload);
  return {
    checkedAt: new Date(),
    connected: status.connected,
    connectedPhone: status.connectedPhone,
    providerStatus: status.connected ? "connected" : "disconnected",
    smartphoneConnected: status.loggedIn,
  };
}

export function assertUazapiProvider(provider: string) {
  if (provider !== "uazapi") {
    throw new CrmMessagingGatewayError(
      `Unsupported CRM WhatsApp provider: ${provider}`,
      409,
      undefined,
      "configuration_error",
    );
  }
}

export function uazapiProviderResponseError(
  status: number,
  label: string,
  token?: string,
) {
  return new CrmMessagingGatewayError(
    redactUazapiTokenInText(`${label} failed with HTTP ${status}`, token),
    status === 429 ? 429 : 502,
    status === 429 ? 1 : undefined,
    status === 429
      ? "rate_limited"
      : status >= 500
        ? "provider_unavailable"
        : "provider_rejected",
  );
}
