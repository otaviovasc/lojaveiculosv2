import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  CrmWhatsappCapabilityError,
  CrmWhatsappGatewayError,
} from "../../domains/crm/ports/crmWhatsappGateway.js";

export type ComposioCrmProvider = "composio_instagram" | "composio_whatsapp";

export type ComposioCrmCredentials = {
  apiBaseUrl: string;
  apiKey: string;
  connectedAccountId: string;
  graphVersion: string;
  provider: ComposioCrmProvider;
  senderId: string;
};

export const DEFAULT_COMPOSIO_API_BASE_URL = "https://backend.composio.dev";
export const META_GRAPH_API_BASE_URL = "https://graph.facebook.com";

export function resolveComposioCrmCredentials(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
): ComposioCrmCredentials {
  const provider = assertComposioProvider(String(connection.provider));
  assertNoRawCredentials(connection.credentialsRef);
  assertNoRawCredentials(connection.metadata);

  const envRefs = readRecord(connection.credentialsRef.env);
  const apiKeyEnv = readString(envRefs.apiKey);
  if (!apiKeyEnv) {
    throw configurationError("Composio API key env reference is missing");
  }

  const apiKey = env[apiKeyEnv]?.trim();
  if (!apiKey) {
    throw configurationError(
      `Composio API key env var is not configured: ${apiKeyEnv}`,
    );
  }

  const composio = readRecord(connection.credentialsRef.composio);
  const connectedAccountId = readString(composio.connectedAccountId);
  if (!connectedAccountId) {
    throw configurationError("Composio connected account ID is missing");
  }

  const senderId = readString(connection.externalConnectionId);
  if (!senderId) {
    throw configurationError("Meta Graph sender ID is missing");
  }

  const graphVersion =
    readString(connection.metadata.graphVersion) ??
    env.COMPOSIO_META_GRAPH_VERSION?.trim() ??
    null;
  if (!graphVersion || !/^v\d+\.\d+$/.test(graphVersion)) {
    throw configurationError(
      "Meta Graph version is missing or invalid (expected vN.N)",
    );
  }

  return {
    apiBaseUrl:
      env.COMPOSIO_API_BASE_URL?.trim().replace(/\/+$/u, "") ||
      DEFAULT_COMPOSIO_API_BASE_URL,
    apiKey,
    connectedAccountId,
    graphVersion,
    provider,
    senderId,
  };
}

export function createMetaMessagesEndpoint(
  credentials: ComposioCrmCredentials,
) {
  return `${META_GRAPH_API_BASE_URL}/${credentials.graphVersion}/${encodeURIComponent(
    credentials.senderId,
  )}/messages`;
}

export function readCanonicalMessageId(
  payload: Record<string, unknown>,
): string {
  const direct =
    readString(payload.message_id) ??
    readString(payload.messageId) ??
    readString(payload.id);
  if (direct) return direct;

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const firstMessage = readRecord(messages[0]);
  const nested = readString(firstMessage.id);
  if (nested) return nested;

  throw new CrmWhatsappGatewayError(
    "Meta accepted the request without returning a message ID",
  );
}

export function unsupportedComposioCapability(
  provider: string,
  capability: string,
): never {
  throw new CrmWhatsappCapabilityError(
    `${provider} does not support CRM messaging capability: ${capability}`,
  );
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assertComposioProvider(provider: string): ComposioCrmProvider {
  if (provider !== "composio_instagram" && provider !== "composio_whatsapp") {
    throw new CrmWhatsappGatewayError(
      `Unsupported Composio CRM provider: ${provider}`,
    );
  }
  return provider;
}

function assertNoRawCredentials(value: Record<string, unknown>) {
  for (const [key, entry] of Object.entries(value)) {
    if (key === "env") continue;
    if (
      typeof entry === "string" &&
      /^(access_?token|api_?key|token)$/i.test(key)
    ) {
      throw configurationError(
        "Raw provider credentials must not be stored in CRM connections",
      );
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      assertNoRawCredentials(entry as Record<string, unknown>);
    }
  }
}

function configurationError(message: string) {
  return new CrmWhatsappGatewayError(message);
}
