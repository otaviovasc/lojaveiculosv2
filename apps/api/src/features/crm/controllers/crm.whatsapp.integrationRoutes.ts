import type { Context, Hono } from "hono";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import {
  whatsappBotActionSchema,
  whatsappBotIntegrationUpdateSchema,
} from "./crm.whatsapp.integrationSchemas.js";
import type { CrmServices } from "./crmServices.js";
import type { UpdateWhatsappBotIntegrationInput } from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";
import type { CrmBotIntegration } from "../../../domains/crm/ports/crmBotIntegrationRepository.js";

type RegisterCrmWhatsappIntegrationRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  resolveBotEntitlements?: ResolveCrmBotEntitlements;
  services: CrmServices;
};

export function registerCrmWhatsappIntegrationRoutes(
  crmFeature: Hono,
  {
    createContext,
    createWebhookContext,
    resolveBotEntitlements = denyAllBotEntitlements,
    services,
  }: RegisterCrmWhatsappIntegrationRoutesOptions,
) {
  crmFeature.get("/whatsapp/integrations/bot", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      const integration =
        await services.getWhatsappBotIntegration(serviceContext);
      return context.json({ integration });
    }),
  );

  crmFeature.post("/whatsapp/integrations/bot/actions", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(context, whatsappBotActionSchema);
      if (context.req.header("Store-Id")) {
        throw new CrmWhatsappValidationError(
          "Store-Id header is not accepted for bot actions.",
        );
      }
      const webhookSecret = context.req.header("x-webhook-secret")?.trim();
      if (!webhookSecret) {
        throw new CrmWhatsappValidationError(
          "Header X-Webhook-Secret is required.",
        );
      }
      const authContext = await createWebhookContext(context);
      const integration = await services.authenticateWhatsappBotSecret(
        authContext,
        { webhookSecret },
      );
      const entitlements = await safeResolveBotEntitlements(
        authContext,
        integration,
        resolveBotEntitlements,
      );
      const result = await services.executeWhatsappBotAction(
        createBotServiceContext(
          authContext,
          integration,
          input.action,
          entitlements,
          input.idempotencyKey,
        ),
        cleanBotActionInput(input),
      );
      return context.json({ action: input.action, result, success: true });
    }),
  );

  crmFeature.patch("/whatsapp/integrations/bot", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappBotIntegrationUpdateSchema,
      );
      if (Object.keys(input).length === 0) {
        throw new CrmWhatsappValidationError(
          "No integration updates provided.",
        );
      }
      const serviceContext = await createContext(context);
      const integration = await services.updateWhatsappBotIntegration(
        serviceContext,
        cleanBotIntegrationUpdate(input),
      );
      return context.json({ integration });
    }),
  );
}

const botPermissions = [
  "crm.whatsapp.close",
  "crm.whatsapp.integrations.manage",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.schedules.create",
  "crm.whatsapp.schedules.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tags.assign",
  "crm.whatsapp.tags.manage",
  "crm.whatsapp.toggle_intervention",
  "crm.visits.manage",
  "crm.visits.read",
  "lead.update",
] satisfies PermissionKey[];

const financingReadBotPermissions = [
  "financing.simulation.read",
] satisfies PermissionKey[];

const financingCreateBotPermissions = [
  "financing.simulation.create",
] satisfies PermissionKey[];

function createBotServiceContext(
  base: ServiceContext,
  integration: CrmBotIntegration,
  action: ReturnType<typeof whatsappBotActionSchema.parse>["action"],
  entitlements: readonly EntitlementKey[],
  idempotencyKey?: string,
) {
  return Object.assign(
    createServiceContext({
      actor: {
        displayName: "CRM WhatsApp Bot",
        ...(integration.id ? { externalId: integration.id } : {}),
        id: integration.id ?? `crm-whatsapp-bot:${integration.storeId}`,
        kind: "integration",
      },
      audit: base.audit,
      logger: base.logger,
      permissions: botPermissionsForAction(action),
      request: {
        ...(base.request ?? { requestId: base.requestId }),
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      ...(base.source ? { source: base.source } : {}),
      storeId: integration.storeId,
      tenantId: integration.tenantId,
    }),
    { entitlements },
  );
}

async function safeResolveBotEntitlements(
  context: ServiceContext,
  integration: CrmBotIntegration,
  resolveBotEntitlements: ResolveCrmBotEntitlements,
) {
  try {
    return await resolveBotEntitlements({
      context,
      integrationId: integration.id,
      storeId: integration.storeId,
      tenantId: integration.tenantId,
    });
  } catch (error) {
    context.logger.warn("crm.whatsapp.bot.entitlements.resolve.failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      integrationId: integration.id,
      requestId: context.requestId,
      storeId: integration.storeId,
      tenantId: integration.tenantId,
    });
    return [];
  }
}

async function denyAllBotEntitlements() {
  return [] satisfies EntitlementKey[];
}

function botPermissionsForAction(
  action: ReturnType<typeof whatsappBotActionSchema.parse>["action"],
) {
  if (action === "credere_create_simulation") {
    return financingCreateBotPermissions;
  }
  if (action === "credere_get_simulation" || action === "credere_readiness") {
    return financingReadBotPermissions;
  }
  return botPermissions;
}

function cleanBotActionInput(
  input: ReturnType<typeof whatsappBotActionSchema.parse>,
) {
  return {
    action: input.action,
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    ...(input.leadId ? { leadId: input.leadId } : {}),
    ...(input.payload ? { payload: input.payload } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.tagId ? { tagId: input.tagId } : {}),
    ...(input.visitId ? { visitId: input.visitId } : {}),
  };
}

function cleanBotIntegrationUpdate(input: {
  enabled?: boolean | undefined;
  webhookSecret?: string | null | undefined;
  webhookUrl?: string | null | undefined;
}): UpdateWhatsappBotIntegrationInput {
  return {
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.webhookSecret !== undefined
      ? { webhookSecret: input.webhookSecret }
      : {}),
    ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
  };
}
