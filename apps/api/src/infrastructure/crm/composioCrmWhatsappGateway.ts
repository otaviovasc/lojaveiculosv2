import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  createComposioMediaRequest,
  createComposioTemplateRequest,
  createComposioTextRequest,
} from "./composioCrmMessagePayload.js";
import { executeComposioProxy } from "./composioCrmProxyClient.js";
import {
  readCanonicalMessageId,
  readRecord,
  readString,
  resolveComposioCrmCredentials,
  unsupportedComposioCapability,
} from "./composioCrmWhatsappGatewaySupport.js";

export function createComposioCrmWhatsappGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmWhatsappGateway {
  const credentialsFor = (connection: CrmConnection) =>
    resolveComposioCrmCredentials(connection, env);
  const unsupported = (connection: CrmConnection, capability: string) =>
    unsupportedComposioCapability(String(connection.provider), capability);

  return {
    async configureWebhooks(connection) {
      return unsupported(connection, "configure webhooks");
    },
    async deleteMessage(connection) {
      return unsupported(connection, "delete message");
    },
    async getConnectionStatus(connection) {
      const credentials = credentialsFor(connection);
      const response = await fetchImpl(
        `${credentials.apiBaseUrl}/api/v3/connected_accounts/${encodeURIComponent(
          credentials.connectedAccountId,
        )}`,
        {
          headers: {
            Accept: "application/json",
            "x-api-key": credentials.apiKey,
          },
          method: "GET",
        },
      );
      const payload = parseJson(await response.text());
      if (!response.ok) {
        return {
          checkedAt: new Date(),
          connected: false,
          connectedPhone: connection.phone,
          providerStatus: "unknown",
          smartphoneConnected: null,
        };
      }

      const status = readString(payload.status)?.toLowerCase() ?? null;
      const connected = status === "active" || status === "connected";
      return {
        checkedAt: new Date(),
        connected,
        connectedPhone: connection.phone,
        providerStatus: status
          ? connected
            ? "connected"
            : "disconnected"
          : "unknown",
        smartphoneConnected: null,
      };
    },
    async listCatalogProducts(connection) {
      return unsupported(connection, "list catalog products");
    },
    async removeReaction(connection) {
      return unsupported(connection, "remove reaction");
    },
    async sendCatalog(connection) {
      return unsupported(connection, "send catalog");
    },
    async sendMedia(connection, input) {
      const credentials = credentialsFor(connection);
      const payload = await executeComposioProxy(
        credentials,
        createComposioMediaRequest(credentials, input),
        fetchImpl,
      );
      return toSendResult(payload);
    },
    async sendProduct(connection) {
      return unsupported(connection, "send product");
    },
    async sendReaction(connection) {
      return unsupported(connection, "send reaction");
    },
    async sendText(connection, input) {
      const credentials = credentialsFor(connection);
      const payload = await executeComposioProxy(
        credentials,
        createComposioTextRequest(credentials, input),
        fetchImpl,
      );
      return toSendResult(payload);
    },
    async sendTemplate(connection, input) {
      const credentials = credentialsFor(connection);
      const payload = await executeComposioProxy(
        credentials,
        createComposioTemplateRequest(credentials, input),
        fetchImpl,
      );
      return toSendResult(payload);
    },
  };
}

function toSendResult(payload: Record<string, unknown>) {
  return {
    externalId: readCanonicalMessageId(payload),
    providerTimestamp: new Date(),
    raw: payload,
  };
}

function parseJson(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    return readRecord(JSON.parse(text));
  } catch {
    return {};
  }
}
