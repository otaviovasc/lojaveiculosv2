import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappZapiCredentialsSchema,
  whatsappZapiReplacementSchema,
  whatsappZapiPairingCodeSchema,
} from "./crm.channelConnections.schemas.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { readWebhookRequestBase } from "./crm.webhookRequestBase.js";
import { toChannelConnectionOverviewItem } from "./crm.channelConnection.dto.js";
import { readConnectionId } from "./crm.channelConnections.routeSupport.js";
import { registerCrmComposioConnectionSetupRoutes } from "./crm.channelConnections.composioSetupRoutes.js";
import { registerCrmUazapiConnectionSetupRoutes } from "./crm.channelConnections.uazapiSetupRoutes.js";

type ConnectionSetupRouteOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmChannelConnectionSetupRoutes(
  crmFeature: Hono,
  { createContext, services }: ConnectionSetupRouteOptions,
) {
  crmFeature.post(
    "/channel-connections/:connectionId/olx-chat/setup/retry",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.retryOlxChatSetup(serviceContext, { connectionId }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/zapi/disconnect",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        const connection = await services.disconnectZapiConnection(
          serviceContext,
          { connectionId },
        );
        return context.json(toChannelConnectionOverviewItem(connection));
      }),
  );

  crmFeature.put(
    "/channel-connections/:connectionId/zapi/credentials",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappZapiCredentialsSchema,
        );
        const serviceContext = await createContext(context);
        const connection = await services.repairZapiConnectionCredentials(
          serviceContext,
          {
            connectionId,
            clientToken: input.clientToken,
            ...(input.expectedRevision !== undefined
              ? { expectedRevision: input.expectedRevision }
              : {}),
            instanceId: input.instanceId,
            instanceToken: input.instanceToken,
            ...readWebhookRequestBase(context),
          },
        );
        return context.json(toChannelConnectionOverviewItem(connection));
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/zapi/status/refresh",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        const connection = await services.refreshZapiConnectionStatus(
          serviceContext,
          { connectionId },
        );
        return context.json(toChannelConnectionOverviewItem(connection));
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/zapi/replacement",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappZapiReplacementSchema,
        );
        const serviceContext = await createContext(context);
        const result = await services.startZapiConnectionReplacement(
          serviceContext,
          { connectionId, ...input, ...readWebhookRequestBase(context) },
        );
        return context.json({
          connection: toChannelConnectionOverviewItem(result.connection),
          operationId: result.operationId,
          status: result.status,
        });
      }),
  );

  crmFeature.get(
    "/channel-connections/:connectionId/zapi/replacement/:operationId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const operationId = readConnectionId(context.req.param("operationId"));
        const serviceContext = await createContext(context);
        const result = await services.getZapiConnectionReplacementStatus(
          serviceContext,
          { connectionId, operationId },
        );
        return context.json({
          connection: toChannelConnectionOverviewItem(result.connection),
          operationId: result.operationId,
          status: result.status,
        });
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/zapi/webhooks/configure",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.configureWhatsappConnectionWebhooks(serviceContext, {
            connectionId,
            mode: "reset",
            ...readWebhookRequestBase(context),
          }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/zapi/pairing/qr",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.requestZapiPairingQr(serviceContext, { connectionId }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/zapi/pairing/code",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappZapiPairingCodeSchema,
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.requestZapiPairingCode(serviceContext, {
            connectionId,
            phone: input.phone,
          }),
        );
      }),
  );
  registerCrmComposioConnectionSetupRoutes(crmFeature, {
    createContext,
    services,
  });
  registerCrmUazapiConnectionSetupRoutes(crmFeature, {
    createContext,
    services,
  });
}
