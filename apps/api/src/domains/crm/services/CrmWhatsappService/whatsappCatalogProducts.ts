import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmWhatsappCatalogProductsPage } from "../../ports/crmMessagingGateway.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { sendOutboundMessage } from "../../messaging/sendOutboundMessage.js";
import {
  getCrmMessagingGateway,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
  auditCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { resolveWhatsappCatalogPhone } from "./sendWhatsappCatalog.js";
import { findScopedConversationCycle } from "../CrmMessagingService/conversationCycleMutationSupport.js";
import { resolveCrmProviderOperation } from "../CrmRoutingService/resolveCrmProviderOperation.js";

const readPermission = "crm.conversations.read";
const sendPermission = "crm.messages.send";

export type ListWhatsappCatalogProductsInput = {
  catalogPhone?: string;
  nextCursor?: string;
  cycleId: string;
};

export type SendWhatsappCatalogProductInput = {
  catalogPhone?: string;
  idempotencyKey?: string;
  productId: string;
  productName?: string;
  cycleId: string;
};

export async function listWhatsappCatalogProducts(
  context: ServiceContext,
  input: ListWhatsappCatalogProductsInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappCatalogProductsPage & { catalogPhone: string }> {
  assertPermission(context, readPermission);
  const scope = requireCrmMessagingScope(context);
  const { conversationCycle } = await findScopedConversationCycle(
    context,
    { cycleId: input.cycleId },
    ports,
  );
  const gateway = getCrmMessagingGateway(ports);
  logCrmServiceEvent(context, "crm.channel.whatsapp.catalog.products.list", {
    cycleId: input.cycleId,
  });
  const connection = await resolveCrmProviderOperation({
    channel: "whatsapp",
    connectionId: conversationCycle.connectionId,
    ports,
    requiredCapabilities: ["catalog"],
    scope,
  });
  const catalogPhone = await resolveWhatsappCatalogPhone(
    connection,
    gateway,
    input.catalogPhone,
  );
  const page = await gateway.listCatalogProducts(connection, {
    catalogPhone,
    ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}),
  });
  await auditCrmServiceEvent(context, {
    action: "crm.channel.whatsapp.catalog.products.list",
    category: "data_access",
    entityId: input.cycleId,
    entityType: "crm_conversation_cycle",
    metadata: {
      catalogPhoneConfigured: Boolean(catalogPhone),
      productCount: page.products.length,
    },
    permission: readPermission,
    summary: "Listed CRM WhatsApp catalog products",
  });
  return { ...page, catalogPhone };
}

export async function sendWhatsappCatalogProduct(
  context: ServiceContext,
  input: SendWhatsappCatalogProductInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, sendPermission);
  logCrmServiceEvent(
    context,
    "crm.channel.whatsapp.message.send_product.started",
    {
      productId: input.productId,
      cycleId: input.cycleId,
    },
  );
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.channel.whatsapp.message.send_product",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { productId: input.productId },
      permission: sendPermission,
      summary: "Sent CRM WhatsApp catalog product",
    },
    () =>
      sendOutboundMessage(
        context,
        {
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          idempotencyPayload: input,
          senderOrigin: "human_crm",
          prepare: async ({ connection, gateway, phone }) => {
            const catalogPhone = await resolveWhatsappCatalogPhone(
              connection,
              gateway,
              input.catalogPhone,
            );
            const sent = await gateway.sendProduct(connection, {
              catalogPhone,
              phone,
              productId: input.productId,
            });
            return {
              content: input.productName ?? "Produto do catalogo",
              leadActivityContent:
                input.productName ?? "Produto do catalogo enviado",
              metadata: {
                catalogProduct: {
                  catalogPhone,
                  productId: input.productId,
                  productName: input.productName ?? null,
                },
                provider: connection.provider,
                providerTransport: "zapi_product",
                sentByActorId: context.actor.id,
              },
              sent,
              type: "CATALOG" as const,
            };
          },
          cycleId: input.cycleId,
        },
        ports,
      ),
  );
}
