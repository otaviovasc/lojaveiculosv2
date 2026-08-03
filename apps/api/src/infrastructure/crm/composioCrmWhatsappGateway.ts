import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  createComposioMediaRequest,
  createComposioTemplateRequest,
  createComposioTextRequest,
} from "./composioCrmMessagePayload.js";
import {
  executeComposioProxy,
  fetchComposio,
} from "./composioCrmProxyClient.js";
import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
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
      const { payload, response } = await fetchComposio(
        credentials,
        `${credentials.apiBaseUrl}/api/v3.1/connected_accounts/${encodeURIComponent(
          credentials.connectedAccountId,
        )}`,
        {
          headers: {
            Accept: "application/json",
            "x-api-key": credentials.apiKey,
          },
          method: "GET",
        },
        fetchImpl,
      );
      if (!response.ok) {
        throw new CrmWhatsappGatewayError(
          `Composio connected-account status failed with HTTP ${response.status}`,
          response.status === 429 ? 429 : 502,
          response.status === 429 ? 1 : undefined,
        );
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
