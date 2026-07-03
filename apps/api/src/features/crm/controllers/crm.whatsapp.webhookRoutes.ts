import { timingSafeEqual } from "node:crypto";
import type { Context, Hono } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

export type RegisterCrmWhatsappWebhookRoutesOptions = {
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappWebhookRoutes(
  crmFeature: Hono,
  { createWebhookContext, services }: RegisterCrmWhatsappWebhookRoutesOptions,
) {
  crmFeature.post(
    "/whatsapp/webhooks/zapi/:connectionId/received",
    async (context) =>
      handleWhatsapp(context, async () => {
        const serviceContext = await authorizeWebhook(
          context,
          createWebhookContext,
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
        );
        const result = await services.processZapiWhatsappChatPresenceWebhook(
          serviceContext,
          await readWebhookInput(context),
        );
        return context.json(result);
      }),
  );
}

async function authorizeWebhook(
  context: Context,
  createWebhookContext: (context: Context) => Promise<ServiceContext>,
) {
  assertWhatsappWebhookAllowed(context);
  return createWebhookContext(context);
}

async function readWebhookInput(context: Context) {
  const connectionId = context.req.param("connectionId");
  if (!connectionId) {
    throw new CrmWhatsappValidationError("Webhook connectionId is required.");
  }
  return {
    connectionId,
    payload: await parseWebhookPayload(context),
  };
}

async function parseWebhookPayload(context: Context) {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new CrmWhatsappValidationError("Webhook body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CrmWhatsappValidationError("Webhook body must be an object.");
  }
  return body as Record<string, unknown>;
}

function assertWhatsappWebhookAllowed(context: Context) {
  const expected = process.env.CRM_ZAPI_WEBHOOK_TOKEN;
  if (expected) {
    const received =
      context.req.header("x-crm-webhook-token") ?? context.req.query("token");
    if (received && tokensMatch(received, expected)) return;
    throw new AuthorizationError("Invalid CRM WhatsApp webhook token.");
  }
  if (!isLocalWebhookEnvironment()) {
    throw new AuthorizationError("CRM WhatsApp webhook token is required.");
  }
}

function isLocalWebhookEnvironment() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.APP_ENV) return process.env.APP_ENV === "local";
  return process.env.NODE_ENV === "test";
}

function tokensMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
