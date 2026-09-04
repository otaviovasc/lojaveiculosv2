import type { Context, Hono } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  isUazapiConnectionEvent,
  isUazapiStatusEvent,
} from "../../../domains/crm/whatsapp/parseUazapiWebhookEvents.js";
import { handleCrmMessaging } from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";
import {
  authorizeUazapiWebhook,
  authorizeWebhook,
  readWebhookInput,
} from "./crm.whatsapp.webhookRouteSupport.js";
import { authorizeOlxWebhook } from "./crm.olx.webhookRouteSupport.js";

export type RegisterCrmWhatsappWebhookRoutesOptions = {
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  resolveEntitlements: ResolveCrmBotEntitlements;
  services: CrmServices;
};

export function registerCrmWhatsappWebhookRoutes(
  crmFeature: Hono,
  {
    createWebhookContext,
    resolveEntitlements,
    services,
  }: RegisterCrmWhatsappWebhookRoutesOptions,
) {
  crmFeature.post("/webhooks/olx/:connectionId/leads", async (context) =>
    handleCrmMessaging(context, async () => {
      const authorized = await authorizeOlxWebhook(
        context,
        createWebhookContext,
        resolveEntitlements,
        services,
      );
      const result = await services.ingestOlxLeadWebhook(
        authorized.serviceContext,
        {
          ...(await readWebhookInput(context)),
          authorization: authorized.authorization,
          entitlementGranted: authorized.entitlementGranted,
        },
      );
      return context.json(result);
    }),
  );

  crmFeature.post("/webhooks/olx/:connectionId/received", async (context) =>
    handleCrmMessaging(context, async () => {
      const authorized = await authorizeOlxWebhook(
        context,
        createWebhookContext,
        resolveEntitlements,
        services,
      );
      const result = await services.ingestOlxChatWebhook(
        authorized.serviceContext,
        {
          ...(await readWebhookInput(context)),
          authorization: authorized.authorization,
          entitlementGranted: authorized.entitlementGranted,
        },
      );
      return context.json(result, result.status === "stored" ? 201 : 200);
    }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/received",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
          resolveEntitlements,
          services,
        );
        const input = await readWebhookInput(context);
        const result = await services.ingestZapiWhatsappWebhook(
          serviceContext,
          input,
        );
        return context.json(result, result.status === "stored" ? 201 : 200);
      }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/delivery",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
          resolveEntitlements,
          services,
        );
        const result = await services.processZapiWhatsappDeliveryWebhook(
          serviceContext,
          await readWebhookInput(context),
        );
        return context.json(result);
      }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/status",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
          resolveEntitlements,
          services,
        );
        const result = await services.processZapiWhatsappStatusWebhook(
          serviceContext,
          await readWebhookInput(context),
        );
        return context.json(result);
      }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/disconnected",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
          resolveEntitlements,
          services,
        );
        const result = await services.processZapiWhatsappDisconnectedWebhook(
          serviceContext,
          await readWebhookInput(context),
        );
        return context.json(result);
      }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/connected",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
          resolveEntitlements,
          services,
        );
        const result = await services.processZapiWhatsappConnectedWebhook(
          serviceContext,
          await readWebhookInput(context),
        );
        return context.json(result);
      }),
  );

  crmFeature.post("/whatsapp/webhooks/uazapi/:connectionId", async (context) =>
    handleCrmMessaging(context, async () => {
      const serviceContext = await authorizeUazapiWebhook(
        context,
        createWebhookContext,
        resolveEntitlements,
        services,
      );
      const input = await readWebhookInput(context);
      // Uazapi registers a single webhook URL per instance; the envelope
      // event kind selects the processing pipeline.
      const result = isUazapiConnectionEvent(input.payload)
        ? await services.processUazapiWhatsappConnectionWebhook(
            serviceContext,
            input,
          )
        : isUazapiStatusEvent(input.payload)
          ? await services.processUazapiWhatsappStatusWebhook(
              serviceContext,
              input,
            )
          : await services.ingestUazapiWhatsappWebhook(serviceContext, input);
      return context.json(result, result.status === "stored" ? 201 : 200);
    }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/chat-presence",
    async (context) =>
      handleCrmMessaging(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
          resolveEntitlements,
          services,
        );
        const result = await services.processZapiWhatsappChatPresenceWebhook(
          serviceContext,
          await readWebhookInput(context),
        );
        return context.json(result);
      }),
  );
}
