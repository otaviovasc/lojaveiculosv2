import {
  CrmMessagingGatewayError,
  type CrmMessagingProviderStatus,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
export { resolveZapiCredentials } from "./zapiCrmWhatsappCredentials.js";

export {
  ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
};

export type ZapiCredentials = {
  apiBaseUrl: string;
  clientToken: string;
  instanceId: string;
  instanceToken: string;
  requestTimeoutMs?: number;
};

export function buildInstanceUrl(credentials: ZapiCredentials) {
  const base = credentials.apiBaseUrl.replace(/\/+$/, "");
  const instancesBase = base.endsWith("/instances")
    ? base
    : `${base}/instances`;
  return `${instancesBase}/${encodeURIComponent(
    credentials.instanceId,
  )}/token/${encodeURIComponent(credentials.instanceToken)}`;
}

export async function fetchZapi(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    credentials.requestTimeoutMs ?? 10_000,
  );
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch {
    throw new CrmMessagingGatewayError(
      controller.signal.aborted
        ? "ZAPI request timed out"
        : "ZAPI request failed before receiving a response",
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

export function readProviderMessageId(payload: Record<string, unknown>) {
  return (
    readProviderId(payload.messageId) ??
    readProviderId(payload.zaapId) ??
    readProviderId(payload.id) ??
    readProviderId(payload.externalId) ??
    null
  );
}

export function requireProviderMessageId(
  payload: Record<string, unknown>,
  label: string,
) {
  const providerMessageId = readProviderMessageId(payload);
  if (providerMessageId) return providerMessageId;

  throw new CrmMessagingGatewayError(
    `${label} returned without a provider message id`,
    502,
    undefined,
    "request_failed",
  );
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readProviderId(value: unknown): string | null {
  const providerId = readString(value);
  return providerId && providerId.length <= 512 ? providerId : null;
}

export function toProviderStatus(
  payload: Record<string, unknown>,
): CrmMessagingProviderStatus {
  const connected = payload.connected === true;
  const smartphoneConnected =
    typeof payload.smartphoneConnected === "boolean"
      ? payload.smartphoneConnected
      : null;
  const isConnected = isZapiProviderConnected(payload);

  return {
    checkedAt: new Date(),
    connected,
    connectedPhone:
      readString(payload.connectedPhone) ??
      readString(payload.phone) ??
      readString(payload.number) ??
      readString(payload.connectedNumber),
    providerStatus: isConnected ? "connected" : "disconnected",
    smartphoneConnected,
  };
}

export function isZapiProviderConnected(payload: Record<string, unknown>) {
  return payload.connected === true || payload.smartphoneConnected === true;
}

export function assertZapiProvider(provider: string) {
  if (provider !== "zapi") {
    throw new CrmMessagingGatewayError(
      `Unsupported CRM WhatsApp provider: ${provider}`,
      409,
      undefined,
      "configuration_error",
    );
  }
}

export function zapiProviderResponseError(status: number, label: string) {
  return new CrmMessagingGatewayError(
    `${label} failed with HTTP ${status}`,
    status === 429 ? 429 : 502,
    status === 429 ? 1 : undefined,
    status === 429
      ? "rate_limited"
      : status >= 500
        ? "provider_unavailable"
        : "provider_rejected",
  );
}
