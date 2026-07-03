import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../../domains/crm/ports/crmWhatsappGateway.js";
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
import {
  assertZapiProvider,
  resolveZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";

export function createZapiCrmWhatsappGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): CrmWhatsappGateway {
  const credentialsFor = (connection: CrmConnection) => {
    assertZapiProvider(connection.provider);
    return resolveZapiCredentials(connection, env);
  };

  return {
    async deleteMessage(connection, input) {
      return deleteZapiMessage(credentialsFor(connection), fetchImpl, input);
    },
    async getConnectionStatus(connection) {
      return readZapiConnectionStatus(credentialsFor(connection), fetchImpl);
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
  };
}
