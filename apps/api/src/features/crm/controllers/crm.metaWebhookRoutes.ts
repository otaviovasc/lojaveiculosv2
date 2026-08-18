import type { Context, Hono } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";
import {
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from "./metaWebhookVerification.js";

export type RegisterCrmMetaWebhookRoutesOptions = {
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmMetaWebhookRoutes(
  crmFeature: Hono,
  { createWebhookContext, services }: RegisterCrmMetaWebhookRoutesOptions,
) {
  crmFeature.get("/webhooks/meta", (context) =>
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

  crmFeature.post("/webhooks/meta", (context) =>
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
}

function parseMetaWebhookPayload(rawBody: string) {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new CrmWhatsappValidationError(
      "Meta webhook body must be valid JSON.",
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CrmWhatsappValidationError(
      "Meta webhook body must be an object.",
    );
  }
  return body as Record<string, unknown>;
}
