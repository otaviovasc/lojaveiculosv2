import type { Context } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { completeZapiWebhookAuthorization } from "../../../domains/crm/services/CrmWhatsappService/authorizeZapiWebhook.js";
import { completeUazapiWebhookAuthorization } from "../../../domains/crm/services/CrmWhatsappService/authorizeUazapiWebhook.js";
import { createZapiWebhookSourceFingerprint } from "../../../infrastructure/crm/olxWebhookSecurity.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createServiceContext,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import { CrmMessagingValidationError } from "./crm.messaging.errors.js";
import { parseWebhookPayload } from "./crm.whatsapp.webhookPayload.js";
import type { CrmServices } from "./crmServices.js";

type WhatsappWebhookAuthorizationHooks = {
  authorize: (
    serviceContext: ServiceContext,
    input: {
      connectionId: string;
      sourceFingerprint: string;
      token: string | null;
    },
  ) => Promise<{ authorized: true; storeId: string; tenantId: string }>;
  complete: (
    context: ServiceContext,
    input: { connectionId: string; storeId: string; tenantId: string },
    outcome: "failed" | "succeeded",
    metadata?: { errorName?: string; reason?: string },
  ) => Promise<void>;
};

export async function authorizeWebhook(
  context: Context,
  createWebhookContext: (context: Context) => Promise<ServiceContext>,
  resolveEntitlements: ResolveCrmBotEntitlements,
  services: CrmServices,
) {
  return authorizeWhatsappWebhook(
    context,
    createWebhookContext,
    resolveEntitlements,
    services,
    {
      authorize: (serviceContext, input) =>
        services.authorizeZapiWebhook(serviceContext, input),
      complete: completeZapiWebhookAuthorization,
    },
  );
}

export async function authorizeUazapiWebhook(
  context: Context,
  createWebhookContext: (context: Context) => Promise<ServiceContext>,
  resolveEntitlements: ResolveCrmBotEntitlements,
  services: CrmServices,
) {
  return authorizeWhatsappWebhook(
    context,
    createWebhookContext,
    resolveEntitlements,
    services,
    {
      authorize: (serviceContext, input) =>
        services.authorizeUazapiWebhook(serviceContext, input),
      complete: completeUazapiWebhookAuthorization,
    },
  );
}

async function authorizeWhatsappWebhook(
  context: Context,
  createWebhookContext: (context: Context) => Promise<ServiceContext>,
  resolveEntitlements: ResolveCrmBotEntitlements,
  services: CrmServices,
  hooks: WhatsappWebhookAuthorizationHooks,
) {
  const serviceContext = await createWebhookContext(context);
  const connectionId = context.req.param("connectionId");
  if (!connectionId) {
    throw new CrmMessagingValidationError("Webhook connectionId is required.");
  }
  const token =
    context.req.header("x-crm-webhook-token") ??
    readBearerToken(context.req.header("authorization")) ??
    context.req.query("token") ??
    null;
  const authorized = await hooks.authorize(serviceContext, {
    connectionId,
    sourceFingerprint: createZapiWebhookSourceFingerprint({
      // Do not trust caller-controlled proxy headers for the authentication
      // bucket. The connection-scoped fingerprint remains stable at the edge.
      clientAddress: null,
      connectionId,
    }),
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
    await hooks.complete(
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
  if (!entitlements.includes("crm")) {
    await hooks.complete(
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
  await hooks.complete(
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

export function createAuthorizedWebhookContext(
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

export function readBearerToken(value: string | undefined): string | null {
  const match = value?.match(/^Bearer\s+(.+)$/iu);
  return match?.[1]?.trim() || null;
}

export async function readWebhookInput(context: Context) {
  const connectionId = context.req.param("connectionId");
  if (!connectionId) {
    throw new CrmMessagingValidationError("Webhook connectionId is required.");
  }
  return {
    connectionId,
    payload: await parseWebhookPayload(context),
  };
}
