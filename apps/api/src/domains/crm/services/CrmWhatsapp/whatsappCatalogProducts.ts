import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmWhatsappCatalogProductsPage } from "../../ports/crmWhatsappGateway.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappSessionNotFoundError,
} from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  getCrmWhatsappRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
  auditWhatsappServiceEvent,
} from "./serviceSupport.js";
import { resolveWhatsappCatalogPhone } from "./sendWhatsappCatalog.js";

const readPermission = "crm.whatsapp.read";
const sendPermission = "crm.whatsapp.send";

export type ListWhatsappCatalogProductsInput = {
  catalogPhone?: string;
  nextCursor?: string;
  sessionId: string;
};

export type SendWhatsappCatalogProductInput = {
  catalogPhone?: string;
  productId: string;
  productName?: string;
  sessionId: string;
};

export async function listWhatsappCatalogProducts(
  context: ServiceContext,
  input: ListWhatsappCatalogProductsInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappCatalogProductsPage & { catalogPhone: string }> {
  assertPermission(context, readPermission);
  const connection = await readSessionConnection(
    context,
    input.sessionId,
    ports,
  );
  const gateway = getCrmWhatsappGateway(ports);
  const catalogPhone = await resolveWhatsappCatalogPhone(
    connection,
    gateway,
    input.catalogPhone,
  );
  logWhatsappServiceEvent(context, "crm.whatsapp.catalog.products.list", {
    catalogPhone,
    sessionId: input.sessionId,
  });
  const page = await gateway.listCatalogProducts(connection, {
    catalogPhone,
    ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}),
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.catalog.products.list",
    category: "data_access",
    entityId: input.sessionId,
    entityType: "crm_whatsapp_session",
    metadata: {
      catalogPhone,
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
): Promise<WhatsappMessage> {
  assertPermission(context, sendPermission);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.message.send_product.started",
    {
      productId: input.productId,
      sessionId: input.sessionId,
    },
  );
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.message.send_product",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { productId: input.productId },
      permission: sendPermission,
      summary: "Sent CRM WhatsApp catalog product",
    },
    () =>
      sendWhatsappOutboundMessage(
        context,
        {
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
                raw: sent.raw,
                sentByActorId: context.actor.id,
              },
              sent,
              type: "CATALOG" as const,
            };
          },
          sessionId: input.sessionId,
        },
        ports,
      ),
  );
}

async function readSessionConnection(
  context: ServiceContext,
  sessionId: string,
  ports: CrmServicePorts,
): Promise<CrmConnection> {
  const scope = requireCrmScope(context);
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new WhatsappSessionNotFoundError(sessionId);
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    session.connectionId,
  );
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.storeId !== session.storeId ||
    connection.tenantId !== session.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(session.connectionId);
  }
  return connection;
}
