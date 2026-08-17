import type { Context, Hono } from "hono";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  ExternalBotError,
  botError,
} from "../../../domains/crm/bot/externalBotErrors.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import type { CrmServices } from "./crmServices.js";
import type { UpdateWhatsappBotIntegrationInput } from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";
import type { ExternalBotActionRequest } from "../../../domains/crm/bot/externalBotCanonicalRequest.js";
import { executeExternalBotAction } from "../../../domains/crm/bot/services/ExternalBotManagerService/executeExternalBotAction.js";
import {
  botConfigurationUpdateSchema,
  externalBotActionSchema,
  externalBotTestSchema,
} from "./crm.bot.schemas.js";
import { handleCrm } from "./crm.controller.errors.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";

export type RegisterExternalBotRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  manager?: ExternalBotManagerPorts;
  services: CrmServices;
};

export function registerExternalBotRoutes(
  crmFeature: Hono,
  options: RegisterExternalBotRoutesOptions,
) {
  crmFeature.get("/bot/configuration", async (context) =>
    handleExternalBot(context, async () => {
      const serviceContext = await options.createContext(context);
      const integration =
        await options.services.getWhatsappBotIntegration(serviceContext);
      return context.json({ configuration: integration });
    }),
  );

  crmFeature.patch("/bot/configuration", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(context, botConfigurationUpdateSchema);
      const serviceContext = await options.createContext(context);
      const update: UpdateWhatsappBotIntegrationInput = {};
      if (input.enabled !== undefined) update.enabled = input.enabled;
      if (input.webhookSecret !== undefined) {
        update.webhookSecret = input.webhookSecret;
      }
      if (input.webhookUrl !== undefined) update.webhookUrl = input.webhookUrl;
      const integration = await options.services.updateWhatsappBotIntegration(
        serviceContext,
        update,
      );
      return context.json({ configuration: integration });
    }),
  );

  crmFeature.post("/bot/test", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(context, externalBotTestSchema);
      const serviceContext = await options.createContext(context);
      const routing = await options.services.getRoutingPolicy(serviceContext);
      const route = routing.channels.find(
        (item) => item.channel === input.channel,
      )?.storeDefault;
      const blocked = route?.blocked ?? {
        code: "policy_not_configured",
        message: "No route is configured for this channel.",
        remediation: "Configure a ready channel connection first.",
      };
      return context.json({
        action: input.action,
        channel: input.channel,
        diagnostics: {
          code: route?.ready ? "DRY_RUN_READY" : blocked.code,
          message: route?.ready
            ? "Synthetic validation completed; no provider operation occurred."
            : blocked.message,
          retryable: false,
        },
        officialOperationOccurred: false,
        requestId: serviceContext.requestId,
        status: route?.ready ? "dry_run_ready" : "blocked",
      });
    }),
  );

  crmFeature.post("/bot/events", async (context) =>
    handleExternalBot(context, async () => {
      return jsonApiError(context, {
        code: "CRM_BOT_EVENT_ISSUANCE_INTERNAL_ONLY",
        message: "Bot events are issued only by canonical CRM workflows.",
        status: 410,
      });
    }),
  );

  crmFeature.post("/bot/actions", async (context) =>
    handleExternalBot(context, async () => {
      const manager = requireManager(options.manager);
      const credential = bearerCredential(context.req.header("authorization"));
      const identity =
        await manager.actionAuthenticator.authenticate(credential);
      if (!identity) {
        throw botError(
          "CRM_BOT_UNAUTHORIZED",
          "Bot credential is invalid.",
          401,
        );
      }
      const input = await parseBody(context, externalBotActionSchema);
      const base = await options.createWebhookContext(context);
      const record = await executeExternalBotAction(
        createBotActionContext(base, identity),
        input as unknown as ExternalBotActionRequest,
        manager,
      );
      return context.json(
        { actionId: record.id, status: record.status },
        record.status === "completed" ? 200 : 202,
      );
    }),
  );
}

function createBotActionContext(
  base: ServiceContext,
  identity: { integrationId: string; storeId: string; tenantId: string },
) {
  return createServiceContext({
    actor: {
      externalId: identity.integrationId,
      id: `external-bot:${identity.integrationId}`,
      kind: "integration",
    },
    audit: base.audit,
    logger: base.logger,
    permissions: ["crm.bot.actions.execute"],
    request: base.request ?? { requestId: base.requestId },
    ...(base.source ? { source: base.source } : {}),
    storeId: identity.storeId,
    tenantId: identity.tenantId,
  });
}

function bearerCredential(header: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? "");
  if (!match?.[1])
    throw botError(
      "CRM_BOT_UNAUTHORIZED",
      "Bearer credential is required.",
      401,
    );
  return match[1];
}

function requireManager(manager: ExternalBotManagerPorts | undefined) {
  if (!manager)
    throw botError(
      "CRM_BOT_UNAVAILABLE",
      "External bot manager is unavailable.",
      503,
    );
  return manager;
}

async function parseBody<
  Schema extends {
    safeParse(value: unknown): { success: boolean; data?: unknown };
  },
>(context: Context, schema: Schema) {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new CrmWhatsappValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new CrmWhatsappValidationError("Request body is invalid.");
  return parsed.data as ReturnType<Schema["safeParse"]> extends {
    data?: infer Data;
  }
    ? Data
    : never;
}

async function handleExternalBot(
  context: Context,
  action: () => Promise<Response>,
) {
  try {
    return await handleWhatsapp(context, action);
  } catch (error) {
    if (error instanceof ExternalBotError) {
      return jsonApiError(context, {
        code: error.code,
        error,
        message: error.message,
        status: error.status,
      });
    }
    throw error;
  }
}
