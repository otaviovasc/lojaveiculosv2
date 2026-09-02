import type { Context } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { OlxWebhookAuthorization } from "../../../domains/crm/services/CrmMessagingService/authorizeOlxChatWebhook.js";
import {
  createOlxWebhookSourceFingerprint,
  isOlxWebhookSourceAllowed,
} from "../../../infrastructure/crm/olxWebhookSecurity.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import { CrmMessagingValidationError } from "./crm.messaging.errors.js";
import {
  createAuthorizedWebhookContext,
  readBearerToken,
} from "./crm.whatsapp.webhookRouteSupport.js";
import type { CrmServices } from "./crmServices.js";

export async function authorizeOlxWebhook(
  context: Context,
  createWebhookContext: (context: Context) => Promise<ServiceContext>,
  resolveEntitlements: ResolveCrmBotEntitlements,
  services: CrmServices,
): Promise<{
  authorization: OlxWebhookAuthorization;
  entitlementGranted: boolean;
  serviceContext: StoreScopedServiceContext & {
    entitlements: Awaited<ReturnType<ResolveCrmBotEntitlements>>;
  };
}> {
  const serviceContext = await createWebhookContext(context);
  const connectionId = context.req.param("connectionId");
  if (!connectionId) {
    throw new CrmMessagingValidationError("Webhook connectionId is required.");
  }
  // This header is authoritative only when deployment explicitly enables the
  // Railway edge contract. x-forwarded-for is never used for authorization.
  const clientAddress = context.req.header("x-real-ip") ?? null;
  if (!isOlxWebhookSourceAllowed(clientAddress)) {
    throw new AuthorizationError("Invalid OLX webhook source.");
  }
  const authorized = await services.authorizeOlxChatWebhook(serviceContext, {
    connectionId,
    sourceFingerprint: createOlxWebhookSourceFingerprint({
      clientAddress,
      connectionId,
    }),
    token:
      context.req.header("x-olx-webhook-secret") ??
      readBearerToken(context.req.header("authorization")) ??
      context.req.query("token") ??
      null,
  });
  const scopedContext = createAuthorizedWebhookContext(
    serviceContext,
    authorized,
  );
  const entitlements = await resolveEntitlements({
    context: scopedContext,
    integrationId: null,
    storeId: authorized.storeId,
    tenantId: authorized.tenantId,
  });
  return {
    authorization: authorized.authorization,
    entitlementGranted: entitlements.includes("crm"),
    serviceContext: { ...scopedContext, entitlements },
  };
}
