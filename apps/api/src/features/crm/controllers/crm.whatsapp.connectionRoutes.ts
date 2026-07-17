import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  buildWhatsappWebhookEndpoints,
  resolveWebhookBaseUrl,
} from "../../../domains/crm/whatsapp/whatsappWebhookEndpoints.js";
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

  crmFeature.post(
    "/whatsapp/connections/:connectionId/webhooks/configure",
    async (context) =>
      handleWhatsapp(context, async () => {
        const connectionId = context.req.param("connectionId");
        if (!connectionId) {
          throw new CrmWhatsappValidationError(
            "Route param connectionId is invalid.",
          );
        }
        const serviceContext = await createContext(context);
        const { basePath, requestOrigin } = readWebhookRequestBase(context);
        const result = await services.configureWhatsappConnectionWebhooks(
          serviceContext,
          {
            basePath,
            connectionId,
            requestOrigin,
            webhookToken: readWebhookToken(),
          },
        );
        return context.json(result);
      }),
  );
}

function withWebhookEndpoints(
  context: Context,
  connections: readonly WhatsappConnection[],
) {
  const { basePath, requestOrigin } = readWebhookRequestBase(context);
  return connections.map((connection) => ({
    ...connection,
    // Displayed URLs intentionally omit the webhook token so it never reaches
    // the browser clipboard; the auto-configure flow appends it server-side.
    webhookEndpoints: buildWhatsappWebhookEndpoints({
      baseUrl: resolveWebhookBaseUrl({
        basePath,
        requestOrigin,
        webhookUrl: connection.webhookUrl,
      }),
      connectionId: connection.id,
    }),
    webhookTokenRequired: Boolean(readWebhookToken()),
  }));
}

function readWebhookRequestBase(context: Context): {
  basePath: string;
  requestOrigin: string;
} {
  const requestUrl = new URL(context.req.url);
  return {
    basePath: requestUrl.pathname.replace(/\/whatsapp\/connections.*$/, ""),
    requestOrigin: requestUrl.origin,
  };
}

function readWebhookToken(): string | null {
  return process.env.CRM_ZAPI_WEBHOOK_TOKEN?.trim() || null;
}
