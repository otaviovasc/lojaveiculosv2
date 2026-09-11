import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  whatsappUazapiCredentialsSchema,
  whatsappUazapiListInstancesSchema,
  whatsappUazapiPairingCodeSchema,
  whatsappUazapiReplacementSchema,
} from "./crm.channelConnections.schemas.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { readWebhookRequestBase } from "./crm.webhookRequestBase.js";
import { toChannelConnectionOverviewItem } from "./crm.channelConnection.dto.js";
import { readConnectionId } from "./crm.channelConnections.routeSupport.js";

export type UazapiConnectionSetupRouteOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmUazapiConnectionSetupRoutes(
  crmFeature: Hono,
  { createContext, services }: UazapiConnectionSetupRouteOptions,
) {
  crmFeature.post(
    "/channel-connections/uazapi/list-instances",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const input = await parseCrmMessagingJson(
          context,
          whatsappUazapiListInstancesSchema,
        );
        const serviceContext = await createContext(context);
        const result = await services.listUazapiInstances(serviceContext, {
          adminToken: input.adminToken,
          ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
        });
        return context.json(result);
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/uazapi/disconnect",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        const connection = await services.disconnectUazapiConnection(
          serviceContext,
          { connectionId },
        );
        return context.json(toChannelConnectionOverviewItem(connection));
      }),
  );

  crmFeature.put(
    "/channel-connections/:connectionId/uazapi/credentials",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappUazapiCredentialsSchema,
        );
        const serviceContext = await createContext(context);
        const connection = await services.repairUazapiConnectionCredentials(
          serviceContext,
          {
            connectionId,
            ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
            ...(input.expectedRevision !== undefined
              ? { expectedRevision: input.expectedRevision }
              : {}),
            instanceId: input.instanceId,
            instanceToken: input.instanceToken,
          },
        );
        return context.json(toChannelConnectionOverviewItem(connection));
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/uazapi/replacement",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappUazapiReplacementSchema,
        );
        const serviceContext = await createContext(context);
        const result = await services.startUazapiConnectionReplacement(
          serviceContext,
          {
            connectionId,
            ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
            expectedRevision: input.expectedRevision,
            idempotencyKey: input.idempotencyKey,
            instanceId: input.instanceId,
            instanceToken: input.instanceToken,
          },
        );
        return context.json({
          connection: toChannelConnectionOverviewItem(result.connection),
          operationId: result.operationId,
          status: result.status,
        });
      }),
  );

  crmFeature.get(
    "/channel-connections/:connectionId/uazapi/replacement/:operationId",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const operationId = readConnectionId(context.req.param("operationId"));
        const serviceContext = await createContext(context);
        const result = await services.getUazapiConnectionReplacementStatus(
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
    "/channel-connections/:connectionId/uazapi/status/refresh",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        const connection = await services.refreshUazapiConnectionStatus(
          serviceContext,
          { connectionId },
        );
        return context.json(toChannelConnectionOverviewItem(connection));
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/uazapi/webhooks/configure",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.configureUazapiConnectionWebhooks(serviceContext, {
            connectionId,
            ...readWebhookRequestBase(context),
          }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/uazapi/pairing/qr",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.requestUazapiPairingQr(serviceContext, {
            connectionId,
            webhookSetupTarget: readWebhookRequestBase(context),
          }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/uazapi/pairing/code",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappUazapiPairingCodeSchema,
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.requestUazapiPairingCode(serviceContext, {
            connectionId,
            ...(input.phone ? { phone: input.phone } : {}),
            webhookSetupTarget: readWebhookRequestBase(context),
          }),
        );
      }),
  );
}
