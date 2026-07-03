import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  CrmWhatsappGatewayError,
  type CrmWhatsappGateway,
} from "../../ports/crmWhatsappGateway.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.send";

export type SendWhatsappCatalogInput = {
  catalogDescription?: string;
  catalogPhone?: string;
  catalogUrl?: string;
  message?: string;
  sessionId: string;
  title?: string;
};

export async function sendWhatsappCatalog(
  context: ServiceContext,
  input: SendWhatsappCatalogInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.message.send_catalog.started",
    {
      sessionId: input.sessionId,
    },
  );
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.message.send_catalog",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { title: input.title ?? null },
      permission,
      summary: "Sent CRM WhatsApp catalog message",
    },
    () =>
      sendWhatsappOutboundMessage(
        context,
        {
          prepare: async ({ connection, gateway, phone }) =>
            prepareCatalogSend(context, input, connection, gateway, phone),
          sessionId: input.sessionId,
        },
        ports,
      ),
  );
}

async function prepareCatalogSend(
  context: ServiceContext,
  input: SendWhatsappCatalogInput,
  connection: CrmConnection,
  gateway: CrmWhatsappGateway,
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
      raw: sent.raw,
      sentByActorId: context.actor.id,
    },
    sent,
    type: "CATALOG" as const,
  };
}

export async function resolveWhatsappCatalogPhone(
  connection: CrmConnection,
  gateway: CrmWhatsappGateway,
  inputCatalogPhone?: string,
) {
  const catalogPhone = inputCatalogPhone?.trim() || connection.phone;
  if (catalogPhone) return catalogPhone;
  const status = await gateway.getConnectionStatus(connection);
  if (status.connectedPhone) return status.connectedPhone;
  throw new CrmWhatsappGatewayError(
    "CRM WhatsApp catalog phone is not configured.",
  );
}
