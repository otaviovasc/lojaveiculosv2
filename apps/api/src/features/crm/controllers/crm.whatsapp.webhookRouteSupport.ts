import type { Context } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { OlxWebhookAuthorization } from "../../../domains/crm/services/CrmMessaging/authorizeOlxChatWebhook.js";
import { completeZapiWebhookAuthorization } from "../../../domains/crm/services/CrmWhatsapp/authorizeZapiWebhook.js";
import { createOlxWebhookSourceFingerprint } from "../../../infrastructure/crm/olxWebhookSecurity.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createServiceContext,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
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
  const scopedContext = createAuthorizedWebhookContext(
    serviceContext,
    authorized,
  );
  let entitlements: Awaited<ReturnType<ResolveCrmBotEntitlements>>;
  try {
    entitlements = await resolveEntitlements({
      context: scopedContext,
      integrationId: null,
      storeId: authorized.storeId,
      tenantId: authorized.tenantId,
    });
  } catch (error) {
    await completeZapiWebhookAuthorization(
      scopedContext,
      {
        connectionId,
        storeId: authorized.storeId,
        tenantId: authorized.tenantId,
      },
      "failed",
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
        reason: "entitlement_resolution_failed",
      },
    );
    throw error;
  }
  if (!entitlements.includes("crm_zapi")) {
    await completeZapiWebhookAuthorization(
      scopedContext,
      {
        connectionId,
        storeId: authorized.storeId,
        tenantId: authorized.tenantId,
      },
      "failed",
      { errorName: "AuthorizationError", reason: "entitlement_missing" },
    );
    throw new AuthorizationError("Invalid CRM WhatsApp webhook token.");
  }
  await completeZapiWebhookAuthorization(
    scopedContext,
    {
      connectionId,
      storeId: authorized.storeId,
      tenantId: authorized.tenantId,
    },
    "succeeded",
  );
  return { ...scopedContext, entitlements };
}

function createAuthorizedWebhookContext(
  base: ServiceContext,
  scope: { storeId: string; tenantId: string },
): StoreScopedServiceContext {
  const scoped = createServiceContext({
    actor: base.actor,
    audit: base.audit,
    ...(base.auditFailureTier
      ? { auditFailureTier: base.auditFailureTier }
      : {}),
    ...(base.billingManagedBy
      ? { billingManagedBy: base.billingManagedBy }
      : {}),
    logger: base.logger,
    ...(base.membershipRole ? { membershipRole: base.membershipRole } : {}),
    permissions: base.permissions,
    request: base.request ?? { requestId: base.requestId },
    ...(base.source ? { source: base.source } : {}),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });

  return {
    ...scoped,
    entitlements: [],
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  };
}

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
    throw new CrmWhatsappValidationError("Webhook connectionId is required.");
  }
  const authorized = await services.authorizeOlxChatWebhook(serviceContext, {
    connectionId,
    // Railway documents x-real-ip as its client-address header. It is only a
    // rate-limit partition key here, never authorization or an IP allowlist:
    // local and ngrok proxy chains cannot enforce the same trust boundary.
    sourceFingerprint: createOlxWebhookSourceFingerprint({
      clientAddress: context.req.header("x-real-ip") ?? null,
      connectionId,
    }),
    token:
      context.req.header("x-olx-webhook-secret") ??
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
