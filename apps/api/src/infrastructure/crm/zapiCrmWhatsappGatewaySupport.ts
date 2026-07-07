import { randomUUID } from "node:crypto";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  CrmWhatsappGatewayError,
  type CrmWhatsappProviderStatus,
} from "../../domains/crm/ports/crmWhatsappGateway.js";

export type ZapiCredentials = {
  apiBaseUrl: string;
  clientToken: string;
  instanceId: string;
  instanceToken: string;
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
    readString(payload.messageId) ??
    readString(payload.zaapId) ??
    readString(payload.id) ??
    readString(payload.externalId) ??
    null
  );
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveZapiCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
): ZapiCredentials {
  const envRefs = readEnvRefs(connection.credentialsRef);
  const stored = readStoredCredentials(connection.credentialsRef);

  if (stored) {
    return {
      apiBaseUrl:
        readOptionalEnv(env, envRefs.apiBaseUrl) ??
        env.CRM_ZAPI_API_BASE_URL?.trim() ??
        "https://api.z-api.io",
      clientToken:
        readOptionalEnv(env, envRefs.clientToken) ??
        env.CRM_ZAPI_CLIENT_TOKEN?.trim() ??
        env.CRM_ZAPI_TEST_CLIENT_TOKEN?.trim() ??
        env.ZAPI_CLIENT_TOKEN?.trim() ??
        readRequiredEnv(env, envRefs.clientToken, "clientToken"),
      instanceId: stored.instanceId,
      instanceToken: stored.instanceToken,
    };
  }

  return {
    apiBaseUrl: readRequiredEnv(env, envRefs.apiBaseUrl, "apiBaseUrl"),
    clientToken: readRequiredEnv(env, envRefs.clientToken, "clientToken"),
    instanceId: readRequiredEnv(env, envRefs.instanceId, "instanceId"),
    instanceToken: readRequiredEnv(env, envRefs.instanceToken, "instanceToken"),
  };
}

export function summarize(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 160
    ? `${normalized.slice(0, 160)}...`
    : normalized;
}

export function toProviderStatus(
  payload: Record<string, unknown>,
): CrmWhatsappProviderStatus {
  const connected = payload.connected === true;
  const smartphoneConnected =
    typeof payload.smartphoneConnected === "boolean"
      ? payload.smartphoneConnected
      : null;
  const isConnected = connected || smartphoneConnected === true;

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

export function assertZapiProvider(provider: string) {
  if (provider !== "zapi") {
    throw new CrmWhatsappGatewayError(
      `Unsupported CRM WhatsApp provider: ${provider}`,
    );
  }
}

export function createProviderMessageId(payload: Record<string, unknown>) {
  return readProviderMessageId(payload) ?? `zapi-outbound-${randomUUID()}`;
}

function readEnvRefs(credentialsRef: Record<string, unknown>) {
  const envRefs =
    credentialsRef.env &&
    typeof credentialsRef.env === "object" &&
    !Array.isArray(credentialsRef.env)
      ? (credentialsRef.env as Record<string, unknown>)
      : {};

  return {
    apiBaseUrl: readString(envRefs.apiBaseUrl),
    clientToken: readString(envRefs.clientToken),
    instanceId: readString(envRefs.instanceId),
    instanceToken: readString(envRefs.instanceToken),
  };
}

function readStoredCredentials(credentialsRef: Record<string, unknown>) {
  const stored =
    credentialsRef.stored &&
    typeof credentialsRef.stored === "object" &&
    !Array.isArray(credentialsRef.stored)
      ? (credentialsRef.stored as Record<string, unknown>)
      : {};
  const instanceId = readString(stored.instanceId);
  const instanceToken = readString(stored.instanceToken);
  return instanceId && instanceToken ? { instanceId, instanceToken } : null;
}

function readOptionalEnv(
  env: Record<string, string | undefined>,
  envName: string | null,
) {
  return envName ? env[envName]?.trim() || null : null;
}

function readRequiredEnv(
  env: Record<string, string | undefined>,
  envName: string | null,
  credentialName: string,
) {
  if (!envName) {
    throw new CrmWhatsappGatewayError(
      `ZAPI credential reference is missing: ${credentialName}`,
    );
  }

  const value = env[envName]?.trim();
  if (!value) {
    throw new CrmWhatsappGatewayError(
      `ZAPI credential env var is not configured: ${envName}`,
    );
  }

  return value;
}
