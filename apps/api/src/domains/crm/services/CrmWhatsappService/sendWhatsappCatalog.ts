import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CrmMessagingGatewayError,
  type CrmMessagingGateway,
} from "../../ports/crmMessagingGateway.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { sendOutboundMessage } from "../../messaging/sendOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.messages.send";

export type SendWhatsappCatalogInput = {
  idempotencyKey?: string;
  catalogDescription?: string;
  catalogPhone?: string;
  catalogUrl?: string;
  message?: string;
  cycleId: string;
  title?: string;
};

export async function sendWhatsappCatalog(
  context: ServiceContext,
  input: SendWhatsappCatalogInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  logCrmServiceEvent(
    context,
    "crm.channel.whatsapp.message.send_catalog.started",
    {
      cycleId: input.cycleId,
    },
  );
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.channel.whatsapp.message.send_catalog",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { title: input.title ?? null },
      permission,
      summary: "Sent CRM WhatsApp catalog message",
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
          prepare: async ({ connection, gateway, phone }) =>
            prepareCatalogSend(context, input, connection, gateway, phone),
          cycleId: input.cycleId,
        },
        ports,
      ),
  );
}

async function prepareCatalogSend(
  context: ServiceContext,
  input: SendWhatsappCatalogInput,
  connection: CrmConnection,
  gateway: CrmMessagingGateway,
  phone: string,
) {
  const catalogPhone = await resolveWhatsappCatalogPhone(
    connection,
    gateway,
    input.catalogPhone,
  );
  const sent = await gateway.sendCatalog(connection, {
    catalogPhone,
    phone,
    ...(input.catalogDescription
      ? { catalogDescription: input.catalogDescription }
      : {}),
    ...(input.message ? { message: input.message } : {}),
    title: input.title ?? "Catalogo da loja",
    translation: "PT",
  });
  return {
    content: input.title ?? "Catalogo",
    leadActivityContent: input.title ?? "Catalogo enviado",
    metadata: {
      catalog: {
        catalogPhone,
        catalogUrl: input.catalogUrl ?? null,
        message: input.message ?? null,
        title: input.title ?? "Catalogo da loja",
      },
      provider: connection.provider,
      providerTransport: "zapi_catalog",
      sentByActorId: context.actor.id,
    },
    sent,
    type: "CATALOG" as const,
  };
}

export async function resolveWhatsappCatalogPhone(
  connection: CrmConnection,
  gateway: CrmMessagingGateway,
  inputCatalogPhone?: string,
) {
  const catalogPhone = inputCatalogPhone?.trim() || connection.phone;
  if (catalogPhone) return catalogPhone;
  const status = await gateway.getConnectionStatus(connection);
  if (status.connectedPhone) return status.connectedPhone;
  throw new CrmMessagingGatewayError(
    "CRM WhatsApp catalog phone is not configured.",
  );
}
