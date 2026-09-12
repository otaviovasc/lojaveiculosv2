import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../domains/crm/ports/crmMessagingGateway.js";
import { CrmMessagingCapabilityError } from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  listZapiCatalogProducts,
  sendZapiCatalog,
  sendZapiProduct,
} from "./zapiCrmWhatsappCatalogActions.js";
import { readZapiConnectionStatus } from "./zapiCrmWhatsappConnectionStatus.js";
import { sendZapiMedia } from "./zapiCrmWhatsappMediaActions.js";
import {
  deleteZapiMessage,
  removeZapiReaction,
  sendZapiReaction,
} from "./zapiCrmWhatsappMessageActions.js";
import { sendZapiText } from "./zapiCrmWhatsappTextActions.js";
import { disconnectZapiConnection } from "./zapiCrmWhatsappConnectionActions.js";
import { configureZapiWebhooks } from "./zapiCrmWhatsappWebhookActions.js";
import {
  assertZapiProvider,
  buildInstanceUrl,
  fetchZapi,
  parseJson,
  resolveZapiCredentials,
  zapiProviderResponseError,
} from "./zapiCrmWhatsappGatewaySupport.js";

export function createZapiCrmWhatsappGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmMessagingGateway {
  const credentialsFor = (connection: CrmConnection) => {
    assertZapiProvider(connection.provider);
    return resolveZapiCredentials(connection, env);
  };

  return {
    async configureWebhooks(connection, input) {
      return configureZapiWebhooks(
        credentialsFor(connection),
        fetchImpl,
        input,
      );
    },
    async deleteMessage(connection, input) {
      return deleteZapiMessage(credentialsFor(connection), fetchImpl, input);
    },
    async disconnectConnection(connection) {
      return disconnectZapiConnection(credentialsFor(connection), fetchImpl);
    },
    async getConnectionStatus(connection) {
      return readZapiConnectionStatus(credentialsFor(connection), fetchImpl);
    },
    async getProfilePhotoUrl(connection, input) {
      const credentials = credentialsFor(connection);
      const response = await fetchZapi(
        credentials,
        fetchImpl,
        `${buildInstanceUrl(credentials)}/profile-picture?phone=${encodeURIComponent(input.phone)}`,
        {
          headers: {
            Accept: "application/json",
            "Client-Token": credentials.clientToken,
          },
          method: "GET",
        },
      );
      const payload = parseJson(await response.text());
      if (response.status === 404) return null;
      if (!response.ok) {
        throw zapiProviderResponseError(response.status, "ZAPI profile photo");
      }
      const link = payload.link;
      return typeof link === "string" && link.trim() ? link.trim() : null;
    },
    async listCatalogProducts(connection, input) {
      return listZapiCatalogProducts(
        credentialsFor(connection),
        fetchImpl,
        input,
      );
    },
    async sendCatalog(connection, input) {
      return sendZapiCatalog(credentialsFor(connection), fetchImpl, input);
    },
    async sendMedia(connection, input) {
      return sendZapiMedia(credentialsFor(connection), fetchImpl, input);
    },
    async sendProduct(connection, input) {
      return sendZapiProduct(credentialsFor(connection), fetchImpl, input);
    },
    async removeReaction(connection, input) {
      return removeZapiReaction(credentialsFor(connection), fetchImpl, input);
    },
    async sendReaction(connection, input) {
      return sendZapiReaction(credentialsFor(connection), fetchImpl, input);
    },
    async sendText(connection, input) {
      return sendZapiText(credentialsFor(connection), fetchImpl, input);
    },
    async sendTemplate() {
      throw new CrmMessagingCapabilityError(
        "Z-API does not use the official WhatsApp template send contract.",
      );
    },
  };
}
