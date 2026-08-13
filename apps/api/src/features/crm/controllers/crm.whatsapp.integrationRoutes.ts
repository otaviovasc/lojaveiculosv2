import type { Context, Hono } from "hono";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import { z } from "zod";
import {
  whatsappBotActionNameSchema,
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
      const probe = await parseWhatsappJson(
        context,
        z.looseObject({ action: whatsappBotActionNameSchema }),
      );
      if (!isCredereAction(probe.action)) {
        return jsonApiError(context, {
          code: "CRM_WHATSAPP_LEGACY_BOT_ACTIONS_GONE",
          message:
            "Use POST /api/v1/crm/bot/actions with a one-time capability grant.",
          status: 410,
        });
      }
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
        createCredereBotContext(
          authContext,
          integration,
          probe.action,
          entitlements,
          input.idempotencyKey,
        ),
        cleanCredereBotActionInput(input),
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

type CredereBotAction =
  "credere_create_simulation" | "credere_get_simulation" | "credere_readiness";

const financingReadBotPermissions = [
  "financing.simulation.read",
] satisfies PermissionKey[];

const financingCreateBotPermissions = [
  "financing.simulation.create",
] satisfies PermissionKey[];

function isCredereAction(action: string): action is CredereBotAction {
  return (
    action === "credere_create_simulation" ||
    action === "credere_get_simulation" ||
    action === "credere_readiness"
  );
}

function createCredereBotContext(
  base: ServiceContext,
  integration: CrmBotIntegration,
  action: CredereBotAction,
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
      permissions:
        action === "credere_create_simulation"
          ? financingCreateBotPermissions
          : financingReadBotPermissions,
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

function cleanCredereBotActionInput(
  input: ReturnType<typeof whatsappBotActionSchema.parse>,
) {
  return {
    action: input.action,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    ...(input.payload ? { payload: input.payload } : {}),
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
