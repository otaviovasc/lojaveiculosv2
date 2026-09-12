import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { whatsappComposioSenderSchema } from "./crm.controller.schemas.js";
import { readConnectionId } from "./crm.channelConnections.routeSupport.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";

export function registerCrmComposioConnectionSetupRoutes(
  crmFeature: Hono,
  options: {
    createContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  const { createContext, services } = options;
  crmFeature.post(
    "/channel-connections/:connectionId/composio/authorize",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.authorizeComposioCrmChannelConnection(serviceContext, {
            connectionId,
          }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/composio/complete",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.completeComposioCrmChannelConnection(serviceContext, {
            connectionId,
          }),
        );
      }),
  );

  crmFeature.post(
    "/channel-connections/:connectionId/composio/sender",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const connectionId = readConnectionId(
          context.req.param("connectionId"),
        );
        const input = await parseCrmMessagingJson(
          context,
          whatsappComposioSenderSchema,
        );
        const serviceContext = await createContext(context);
        return context.json(
          await services.selectComposioChannelSender(serviceContext, {
            connectionId,
            senderId: input.senderId,
          }),
        );
      }),
  );
}
