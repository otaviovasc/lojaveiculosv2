import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { whatsappUpdateConnectionSchema } from "./crm.controller.schemas.js";
import {
  assertWhatsappList,
  parseWhatsappJson,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";
import type { WhatsappConnection } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";

type RegisterCrmWhatsappConnectionRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappConnectionRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappConnectionRoutesOptions,
) {
  crmFeature.get("/whatsapp/connections", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      assertWhatsappList(serviceContext);
      const connections =
        await services.listWhatsappConnections(serviceContext);
      return context.json({
        connections: withWebhookEndpoints(context, connections),
      });
    }),
  );

  crmFeature.patch("/whatsapp/connections/:connectionId", async (context) =>
    handleWhatsapp(context, async () => {
      const connectionId = context.req.param("connectionId");
      if (!connectionId) {
        throw new CrmWhatsappValidationError(
          "Route param connectionId is invalid.",
        );
      }
      const input = await parseWhatsappJson(
        context,
        whatsappUpdateConnectionSchema,
      );
      const serviceContext = await createContext(context);
      const connection = await services.updateWhatsappConnection(
        serviceContext,
        {
          ...(input.catalogPhone !== undefined
            ? { catalogPhone: input.catalogPhone }
            : {}),
          ...(input.connectedPhone !== undefined
            ? { connectedPhone: input.connectedPhone }
            : {}),
          connectionId,
          ...(input.credentialsEnv
            ? { credentialsEnv: input.credentialsEnv }
            : {}),
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.externalConnectionId !== undefined
            ? { externalConnectionId: input.externalConnectionId }
            : {}),
          ...(input.externalInstanceId !== undefined
            ? { externalInstanceId: input.externalInstanceId }
            : {}),
          ...(input.instanceCredentials
            ? { instanceCredentials: input.instanceCredentials }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.webhookUrl !== undefined
            ? { webhookUrl: input.webhookUrl }
            : {}),
        },
      );
      return context.json(
        withWebhookEndpoints(context, [connection])[0] ?? connection,
      );
    }),
  );
}

type ZapiWebhookEndpointType =
  | "chat-presence"
  | "connected"
  | "delivery"
  | "disconnected"
  | "received"
  | "status";

const zapiWebhookEndpoints: Array<{
  label: string;
  type: ZapiWebhookEndpointType;
}> = [
  { label: "Mensagens recebidas", type: "received" },
  { label: "Entrega", type: "delivery" },
  { label: "Status de mensagem", type: "status" },
  { label: "Conectado", type: "connected" },
  { label: "Desconectado", type: "disconnected" },
  { label: "Presenca no chat", type: "chat-presence" },
];

function withWebhookEndpoints(
  context: Context,
  connections: readonly WhatsappConnection[],
) {
  return connections.map((connection) => {
    const webhookBaseUrl = readWebhookBaseUrl(context, connection);
    return {
      ...connection,
      webhookEndpoints: zapiWebhookEndpoints.map((endpoint) => ({
        ...endpoint,
        url: `${webhookBaseUrl}/whatsapp/webhooks/zapi/${encodeURIComponent(
          connection.id,
        )}/${endpoint.type}`,
      })),
      webhookTokenRequired: Boolean(process.env.CRM_ZAPI_WEBHOOK_TOKEN),
    };
  });
}

function readWebhookBaseUrl(context: Context, connection: WhatsappConnection) {
  const requestUrl = new URL(context.req.url);
  const basePath = requestUrl.pathname.replace(
    /\/whatsapp\/connections.*$/,
    "",
  );
  if (connection.webhookUrl) {
    try {
      const configured = new URL(connection.webhookUrl);
      const configuredPath = configured.pathname.replace(/\/+$/, "");
      return configuredPath
        ? `${configured.origin}${configuredPath}`
        : `${configured.origin}${basePath}`;
    } catch {
      return `${requestUrl.origin}${basePath}`;
    }
  }
  return `${requestUrl.origin}${basePath}`;
}
