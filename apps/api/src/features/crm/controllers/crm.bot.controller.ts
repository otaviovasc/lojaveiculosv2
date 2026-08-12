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
import type { ExternalBotActionRequest } from "../../../domains/crm/bot/externalBotCanonicalRequest.js";
import { executeExternalBotAction } from "../../../domains/crm/bot/services/ExternalBotManagerService/executeExternalBotAction.js";
import { externalBotActionSchema } from "./crm.bot.schemas.js";
import {
  CrmRequestValidationError,
  handleCrm,
} from "./crm.controller.errors.js";

export type RegisterExternalBotRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  manager?: ExternalBotManagerPorts;
};

export function registerExternalBotRoutes(
  crmFeature: Hono,
  options: RegisterExternalBotRoutesOptions,
) {
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
    throw new CrmRequestValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new CrmRequestValidationError("Request body is invalid.");
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
    return await handleCrm(context, action);
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
