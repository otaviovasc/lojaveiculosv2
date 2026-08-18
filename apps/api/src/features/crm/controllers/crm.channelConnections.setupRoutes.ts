import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { whatsappComposioSenderSchema } from "./crm.controller.schemas.js";
import { whatsappZapiPairingCodeSchema } from "./crm.channelConnections.schemas.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import { readWebhookRequestBase } from "./crm.webhookRequestBase.js";

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
        return context.json(
          await services.disconnectZapiConnection(serviceContext, {
            connectionId,
          }),
        );
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
        return context.json(
          await services.refreshZapiConnectionStatus(serviceContext, {
            connectionId,
          }),
        );
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

function readConnectionId(value: string | undefined) {
  if (!value) {
    throw new CrmMessagingValidationError(
      "Route param connectionId is invalid.",
    );
  }
  return value;
}
