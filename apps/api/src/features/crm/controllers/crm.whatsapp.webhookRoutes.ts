import type { Context, Hono } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { handleWhatsapp } from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";
import {
  authorizeOlxWebhook,
  authorizeWebhook,
  parseMetaWebhookPayload,
  readWebhookInput,
} from "./crm.whatsapp.webhookRouteSupport.js";
import {
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from "./metaWebhookVerification.js";

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
  crmFeature.post(
    "/whatsapp/webhooks/olx/:connectionId/leads",
    async (context) =>
      handleWhatsapp(context, async () => {
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

  crmFeature.post(
    "/whatsapp/webhooks/olx/:connectionId/received",
    async (context) =>
      handleWhatsapp(context, async () => {
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

  crmFeature.get("/whatsapp/webhooks/meta", (context) =>
    handleWhatsapp(context, async () => {
      const expectedVerifyToken =
        process.env.CRM_META_WEBHOOK_VERIFY_TOKEN?.trim();
      if (!expectedVerifyToken) {
        throw new AuthorizationError(
          "Meta webhook verification is not configured.",
        );
      }
      const challenge = context.req.query("hub.challenge");
      const mode = context.req.query("hub.mode");
      const verifyToken = context.req.query("hub.verify_token");
      const result = verifyMetaWebhookChallenge({
        ...(challenge ? { challenge } : {}),
        expectedVerifyToken,
        ...(mode ? { mode } : {}),
        ...(verifyToken ? { verifyToken } : {}),
      });
      if (!result.ok) {
        throw new AuthorizationError("Invalid Meta webhook challenge.");
      }
      return context.text(result.challenge);
    }),
  );

  crmFeature.post("/whatsapp/webhooks/meta", (context) =>
    handleWhatsapp(context, async () => {
      const appSecret = process.env.CRM_META_APP_SECRET?.trim();
      if (!appSecret) {
        throw new AuthorizationError(
          "Meta webhook signature verification is not configured.",
        );
      }
      const rawBody = await context.req.text();
      const signatureHeader = context.req.header("x-hub-signature-256");
      if (
        !verifyMetaWebhookSignature({
          appSecret,
          rawBody,
          ...(signatureHeader ? { signatureHeader } : {}),
        })
      ) {
        throw new AuthorizationError("Invalid Meta webhook signature.");
      }
      const payload = parseMetaWebhookPayload(rawBody);
      const serviceContext = await createWebhookContext(context);
      return context.json(
        await services.processMetaMessagingWebhook(serviceContext, payload),
      );
    }),
  );

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/received",
    async (context) =>
      handleWhatsapp(context, async () => {
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
      handleWhatsapp(context, async () => {
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
      handleWhatsapp(context, async () => {
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
      handleWhatsapp(context, async () => {
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
      handleWhatsapp(context, async () => {
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

  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/chat-presence",
    async (context) =>
      handleWhatsapp(context, async () => {
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
