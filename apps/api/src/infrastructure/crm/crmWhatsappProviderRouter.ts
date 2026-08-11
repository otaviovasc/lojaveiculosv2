import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  CrmWhatsappCapabilityError,
  CrmWhatsappGatewayError,
  type CrmWhatsappGateway,
} from "../../domains/crm/ports/crmWhatsappGateway.js";
import { createComposioCrmWhatsappGateway } from "./composioCrmWhatsappGateway.js";
import { createZapiCrmWhatsappGateway } from "./zapiCrmWhatsappGateway.js";
import { createOlxCrmChatGateway } from "./olxCrmChatGateway.js";

export function createCrmWhatsappProviderRouter(
  zapiGateway: CrmWhatsappGateway,
  composioGateway: CrmWhatsappGateway,
  olxGateway: CrmWhatsappGateway,
  options: { olxChatEnabled: boolean } = { olxChatEnabled: false },
): CrmWhatsappGateway {
  const gatewayFor = (connection: CrmConnection) => {
    const provider = String(connection.provider);
    if (provider === "zapi") return zapiGateway;
    if (provider === "olx_chat") {
      if (!options.olxChatEnabled) {
        throw new CrmWhatsappCapabilityError(
          "OLX Chat is disabled by the server runtime policy.",
        );
      }
      return olxGateway;
    }
    if (provider === "composio_whatsapp" || provider === "composio_instagram") {
      return composioGateway;
    }
    throw new CrmWhatsappGatewayError(
      `Unsupported CRM WhatsApp provider: ${provider}`,
    );
  };

  return {
    configureWebhooks: (connection, input) =>
      gatewayFor(connection).configureWebhooks(connection, input),
    deleteMessage: (connection, input) =>
      gatewayFor(connection).deleteMessage(connection, input),
    getConnectionStatus: (connection) =>
      gatewayFor(connection).getConnectionStatus(connection),
    listCatalogProducts: (connection, input) =>
      gatewayFor(connection).listCatalogProducts(connection, input),
    removeReaction: (connection, input) =>
      gatewayFor(connection).removeReaction(connection, input),
    sendCatalog: (connection, input) =>
      gatewayFor(connection).sendCatalog(connection, input),
    sendMedia: (connection, input) =>
      gatewayFor(connection).sendMedia(connection, input),
    sendProduct: (connection, input) =>
      gatewayFor(connection).sendProduct(connection, input),
    sendReaction: (connection, input) =>
      gatewayFor(connection).sendReaction(connection, input),
    sendText: (connection, input) =>
      gatewayFor(connection).sendText(connection, input),
    sendTemplate: (connection, input) =>
      gatewayFor(connection).sendTemplate(connection, input),
  };
}

export function createRuntimeCrmWhatsappProviderGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  return createCrmWhatsappProviderRouter(
    createZapiCrmWhatsappGateway(env, fetchImpl),
    createComposioCrmWhatsappGateway(env, fetchImpl),
    createOlxCrmChatGateway(env, fetchImpl),
    { olxChatEnabled: isOlxChatRuntimeEnabled(env) },
  );
}

export function isOlxChatRuntimeEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env.CRM_OLX_CHAT_ENABLED === "true";
}
