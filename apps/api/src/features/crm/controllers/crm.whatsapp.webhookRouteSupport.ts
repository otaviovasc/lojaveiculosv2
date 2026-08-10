import type { Context } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmWhatsappValidationError } from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

export function parseMetaWebhookPayload(rawBody: string) {
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

export async function authorizeWebhook(
  context: Context,
  createWebhookContext: (context: Context) => Promise<ServiceContext>,
  resolveEntitlements: ResolveCrmBotEntitlements,
  services: CrmServices,
) {
  const serviceContext = await createWebhookContext(context);
  const connectionId = context.req.param("connectionId");
  if (!connectionId) {
    throw new CrmWhatsappValidationError("Webhook connectionId is required.");
  }
  const token =
    context.req.header("x-crm-webhook-token") ??
    context.req.query("token") ??
    null;
  const authorized = await services.authorizeZapiWebhook(serviceContext, {
    connectionId,
    token,
  });
  const entitlements = await resolveEntitlements({
    context: serviceContext,
    integrationId: null,
    storeId: authorized.storeId,
    tenantId: authorized.tenantId,
  });
  if (!entitlements.includes("crm_zapi")) {
    throw new AuthorizationError("Invalid CRM WhatsApp webhook token.");
  }
  return serviceContext;
}

export async function readWebhookInput(context: Context) {
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
