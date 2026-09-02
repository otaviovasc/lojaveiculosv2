import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../domains/crm/ports/crmMessagingGateway.js";
import { CrmMessagingCapabilityError } from "../../domains/crm/ports/crmMessagingGateway.js";
import { readUazapiConnectionStatus } from "./uazapiCrmWhatsappConnectionStatus.js";
import { disconnectUazapiConnection } from "./uazapiCrmWhatsappConnectionActions.js";
import {
  downloadUazapiInboundMedia,
  sendUazapiMedia,
} from "./uazapiCrmWhatsappMediaActions.js";
import {
  deleteUazapiMessage,
  removeUazapiReaction,
  sendUazapiReaction,
} from "./uazapiCrmWhatsappMessageActions.js";
import { sendUazapiText } from "./uazapiCrmWhatsappTextActions.js";
import { configureUazapiWebhooks } from "./uazapiCrmWhatsappWebhookActions.js";
import {
  assertUazapiProvider,
  resolveUazapiCredentials,
} from "./uazapiCrmWhatsappGatewaySupport.js";

export function createUazapiCrmWhatsappGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmMessagingGateway {
  const credentialsFor = (connection: CrmConnection) => {
    assertUazapiProvider(connection.provider);
    return resolveUazapiCredentials(connection, env);
  };

  return {
    async configureWebhooks(connection, input) {
      return configureUazapiWebhooks(
        credentialsFor(connection),
        fetchImpl,
        input,
      );
    },
    async deleteMessage(connection, input) {
      return deleteUazapiMessage(credentialsFor(connection), fetchImpl, input);
    },
    async disconnectConnection(connection) {
      return disconnectUazapiConnection(credentialsFor(connection), fetchImpl);
    },
    async downloadInboundMedia(connection, input) {
      return downloadUazapiInboundMedia(
        credentialsFor(connection),
        fetchImpl,
        input,
      );
    },
    async getConnectionStatus(connection) {
      return readUazapiConnectionStatus(credentialsFor(connection), fetchImpl);
    },
    async listCatalogProducts() {
      throw new CrmMessagingCapabilityError(
        "UAZAPI does not support the WhatsApp catalog product list contract.",
      );
    },
    async sendCatalog() {
      throw new CrmMessagingCapabilityError(
        "UAZAPI does not support the WhatsApp catalog send contract.",
      );
    },
    async sendMedia(connection, input) {
      return sendUazapiMedia(credentialsFor(connection), fetchImpl, input);
    },
    async sendProduct() {
      throw new CrmMessagingCapabilityError(
        "UAZAPI does not support the WhatsApp product send contract.",
      );
    },
    async removeReaction(connection, input) {
      return removeUazapiReaction(credentialsFor(connection), fetchImpl, input);
    },
    async sendReaction(connection, input) {
      return sendUazapiReaction(credentialsFor(connection), fetchImpl, input);
    },
    async sendText(connection, input) {
      return sendUazapiText(credentialsFor(connection), fetchImpl, input);
    },
    async sendTemplate() {
      throw new CrmMessagingCapabilityError(
        "UAZAPI does not use the official WhatsApp template send contract.",
      );
    },
  };
}
