import { randomUUID } from "node:crypto";
import type { CrmWhatsappGateway } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  CrmWhatsappCapabilityError,
  CrmWhatsappGatewayError,
} from "../../domains/crm/ports/crmWhatsappGateway.js";
import { resolveOlxAccessToken } from "./olxCrmChatCredentials.js";

const baseUrl = "https://apps.olx.com.br/autoservice/v1";
const requestTimeoutMs = 10_000;

export function createOlxCrmChatGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmWhatsappGateway {
  const unsupported = (capability: string): never => {
    throw new CrmWhatsappCapabilityError(
      `OLX Chat supports text replies only; ${capability} is unavailable.`,
    );
  };
  return {
    configureWebhooks: async () => unsupported("webhook configuration"),
    deleteMessage: async () => unsupported("message deletion"),
    getConnectionStatus: async () => ({
      checkedAt: new Date(),
      connected: false,
      connectedPhone: null,
      providerStatus: "unknown",
      smartphoneConnected: null,
    }),
    listCatalogProducts: async () => unsupported("catalog"),
    removeReaction: async () => unsupported("reactions"),
    sendCatalog: async () => unsupported("catalog"),
    sendMedia: async () => unsupported("media"),
    sendProduct: async () => unsupported("catalog products"),
    sendReaction: async () => unsupported("reactions"),
    sendTemplate: async () => unsupported("templates"),
    sendText: async (connection, input) => {
      if (connection.provider !== "olx_chat") {
        throw new CrmWhatsappGatewayError("Invalid OLX Chat connection.");
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
        throw new CrmWhatsappGatewayError(
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
    throw new CrmWhatsappGatewayError(
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
    return new CrmWhatsappGatewayError(
      "OLX Chat rate limit was reached.",
      429,
      1,
      "rate_limited",
    );
  }
  return new CrmWhatsappGatewayError(
    "OLX Chat rejected the text message.",
    502,
    undefined,
    "provider_rejected",
  );
}
