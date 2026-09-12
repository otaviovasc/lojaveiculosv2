import { randomUUID } from "node:crypto";
import type { CrmMessagingGateway } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  CrmMessagingCapabilityError,
  CrmMessagingGatewayError,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import { resolveOlxAccessToken } from "./olxCrmChatCredentials.js";
import { fetchOlxBasicUserInfo } from "../marketplace/olxBasicUserInfo.js";

const baseUrl = "https://apps.olx.com.br/autoservice/v1";
const olxApiBaseUrl = "https://apps.olx.com.br";
const requestTimeoutMs = 10_000;

export function createOlxCrmChatGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmMessagingGateway {
  const unsupported = (capability: string): never => {
    throw new CrmMessagingCapabilityError(
      `OLX Chat supports text replies only; ${capability} is unavailable.`,
    );
  };
  return {
    configureWebhooks: async () => unsupported("webhook configuration"),
    deleteMessage: async () => unsupported("message deletion"),
    disconnectConnection: async () => unsupported("provider disconnect"),
    getConnectionStatus: async (connection) => {
      if (connection.provider !== "olx" || connection.channel !== "olx_chat") {
        throw new CrmMessagingGatewayError("Invalid OLX Chat connection.");
      }
      const checkedAt = new Date();
      const chatStatus = readOlxChatSetupStatus(connection);
      if (connection.status !== "active" || chatStatus !== "active") {
        return {
          checkedAt,
          connected: false,
          connectedPhone: null,
          providerStatus:
            chatStatus === null
              ? ("unknown" as const)
              : ("disconnected" as const),
          smartphoneConnected: null,
        };
      }
      const accessToken = resolveOlxAccessToken(connection, env);
      const providerStatus = await readOlxProviderStatus(
        fetchImpl,
        accessToken,
      );
      return {
        checkedAt,
        connected: providerStatus === "connected",
        connectedPhone: null,
        providerStatus,
        smartphoneConnected: null,
      };
    },
    listCatalogProducts: async () => unsupported("catalog"),
    removeReaction: async () => unsupported("reactions"),
    sendCatalog: async () => unsupported("catalog"),
    sendMedia: async () => unsupported("media"),
    sendProduct: async () => unsupported("catalog products"),
    sendReaction: async () => unsupported("reactions"),
    sendTemplate: async () => unsupported("templates"),
    sendText: async (connection, input) => {
      if (connection.provider !== "olx" || connection.channel !== "olx_chat") {
        throw new CrmMessagingGatewayError("Invalid OLX Chat connection.");
      }
      if (input.replyToMessageId) unsupported("quoted replies");
      const token = resolveOlxAccessToken(connection, env);
      const messageId = randomUUID();
      const response = await requestWithTimeout(
        `${baseUrl}/chat/send`,
        {
          body: JSON.stringify({
            chatId: input.phone,
            messageId,
            textMessage: input.text,
          }),
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          method: "POST",
          redirect: "manual",
        },
        fetchImpl,
        requestTimeoutMs,
      );
      if (response.status >= 300 && response.status < 400) {
        throw new CrmMessagingGatewayError(
          "OLX Chat redirect was rejected.",
          502,
          undefined,
          "provider_rejected",
        );
      }
      if (!response.ok) throw providerError(response.status);
      return { externalId: messageId, providerTimestamp: new Date() };
    },
  };
}

async function readOlxProviderStatus(
  fetchImpl: typeof fetch,
  accessToken: string,
): Promise<"connected" | "disconnected" | "unknown"> {
  try {
    const { response } = await fetchOlxBasicUserInfo(fetchImpl, {
      accessToken,
      baseUrl: olxApiBaseUrl,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (response.ok) return "connected";
    if (response.status === 401 || response.status === 403)
      return "disconnected";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function readOlxChatSetupStatus(
  connection: Parameters<CrmMessagingGateway["getConnectionStatus"]>[0],
): "active" | "blocked" | "error" | null {
  const setup = readRecord(connection.metadata.webhookSetup);
  const capabilities = readRecord(setup.capabilities);
  const chat = readRecord(capabilities.chat);
  return ["active", "blocked", "error"].includes(String(chat.status))
    ? (chat.status as "active" | "blocked" | "error")
    : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function requestWithTimeout(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs: number,
) {
  try {
    return await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new CrmMessagingGatewayError(
      error instanceof DOMException && error.name === "TimeoutError"
        ? "OLX Chat request timed out."
        : "OLX Chat request failed.",
      502,
      undefined,
      error instanceof DOMException && error.name === "TimeoutError"
        ? "timeout"
        : "request_failed",
    );
  }
}

function providerError(status: number) {
  if (status === 429) {
    return new CrmMessagingGatewayError(
      "OLX Chat rate limit was reached.",
      429,
      1,
      "rate_limited",
    );
  }
  if (status >= 500) {
    return new CrmMessagingGatewayError(
      "OLX Chat is temporarily unavailable.",
      502,
      undefined,
      "provider_unavailable",
    );
  }
  return new CrmMessagingGatewayError(
    "OLX Chat rejected the text message.",
    502,
    undefined,
    "provider_rejected",
  );
}
