import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  CrmMessagingCapabilityError,
  CrmMessagingGatewayError,
  type CrmMessagingGateway,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import { createComposioCrmMessagingGateway } from "./composioCrmMessagingGateway.js";
import { createZapiCrmWhatsappGateway } from "./zapiCrmWhatsappGateway.js";
import { createOlxCrmChatGateway } from "./olxCrmChatGateway.js";

export function createCrmMessagingProviderRouter(
  zapiGateway: CrmMessagingGateway,
  composioGateway: CrmMessagingGateway,
  olxGateway: CrmMessagingGateway,
  options: { olxChatEnabled: boolean } = { olxChatEnabled: false },
): CrmMessagingGateway {
  const gatewayFor = (connection: CrmConnection) => {
    const provider = connection.provider;
    if (provider === "zapi") return zapiGateway;
    if (provider === "olx" && connection.channel === "olx_chat") {
      if (!options.olxChatEnabled) {
        throw new CrmMessagingCapabilityError(
          "OLX Chat is disabled by the server runtime policy.",
        );
      }
      return olxGateway;
    }
    if (
      provider === "meta_cloud" &&
      connection.broker === "composio" &&
      (connection.channel === "whatsapp" || connection.channel === "instagram")
    ) {
      return composioGateway;
    }
    throw new CrmMessagingGatewayError(
      `Unsupported CRM messaging provider: ${provider}`,
    );
  };

  return {
    configureWebhooks: (connection, input) =>
      gatewayFor(connection).configureWebhooks(connection, input),
    deleteMessage: (connection, input) =>
      gatewayFor(connection).deleteMessage(connection, input),
    disconnectConnection: (connection) =>
      gatewayFor(connection).disconnectConnection(connection),
    getConnectionStatus: (connection) =>
      gatewayFor(connection).getConnectionStatus(connection),
    getProfilePhotoUrl: async (connection, input) =>
      gatewayFor(connection).getProfilePhotoUrl?.(connection, input) ?? null,
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

export function createRuntimeCrmMessagingProviderGateway(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  return createCrmMessagingProviderRouter(
    createZapiCrmWhatsappGateway(env, fetchImpl),
    createComposioCrmMessagingGateway(env, fetchImpl),
    createOlxCrmChatGateway(env, fetchImpl),
    { olxChatEnabled: isOlxChatRuntimeEnabled(env) },
  );
}

export function isOlxChatRuntimeEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env.CRM_OLX_CHAT_ENABLED === "true";
}
