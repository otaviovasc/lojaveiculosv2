import { createHash } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmBotIntegration } from "../../ports/crmBotIntegrationRepository.js";
import {
  getCrmBotIntegrationRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.integrations.manage";

export type UpdateWhatsappBotIntegrationInput = {
  enabled?: boolean;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
};

export type AuthenticateWhatsappBotSecretInput = {
  webhookSecret: string;
};

export type WhatsappBotActionName =
  | "add_note"
  | "assign_tag"
  | "check_connection"
  | "close_session"
  | "create_tag"
  | "get_session"
  | "list_tags"
  | "remove_tag"
  | "remove_visita"
  | "schedule_message"
  | "send_audio"
  | "send_document"
  | "send_image"
  | "send_text"
  | "set_intervention"
  | "set_visita"
  | "update_session";

export async function getWhatsappBotIntegration(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmBotIntegration> {
  assertPermission(context, permission);
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.integrations.bot.read.start");
  const integration = await getCrmBotIntegrationRepository(
    ports,
  ).findBotIntegration({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.integrations.bot.read",
    category: "data_access",
    metadata: { configured: Boolean(integration?.webhookUrl) },
    permission,
    summary: "Read CRM WhatsApp bot integration",
  });
  return integration ?? defaultBotIntegration(scope);
}

export async function updateWhatsappBotIntegration(
  context: ServiceContext,
  input: UpdateWhatsappBotIntegrationInput,
  ports: CrmServicePorts,
): Promise<CrmBotIntegration> {
  assertPermission(context, permission);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmBotIntegrationRepository(ports);
  const current =
    (await repository.findBotIntegration({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })) ?? defaultBotIntegration(scope);
  const nextEnabled = input.enabled ?? current.enabled;
  const nextWebhookUrl =
    input.webhookUrl === undefined ? current.webhookUrl : input.webhookUrl;
  const nextSecretConfigured =
    input.webhookSecret === undefined
      ? current.secretConfigured
      : Boolean(input.webhookSecret);

  if (nextEnabled && (!nextWebhookUrl || !nextSecretConfigured)) {
    throw new WhatsappBotIntegrationIncompleteError();
  }

  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.integrations.bot.update.start",
    {
      enabled: nextEnabled,
      secretChanged: input.webhookSecret !== undefined,
      webhookConfigured: Boolean(nextWebhookUrl),
    },
  );

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.integrations.bot.update",
      category: "data_change",
      entityType: "crm_whatsapp_bot_integration",
      metadata: {
        enabled: nextEnabled,
        permission,
        secretChanged: input.webhookSecret !== undefined,
        webhookConfigured: Boolean(nextWebhookUrl),
      },
      permission,
      summary: "Updated CRM WhatsApp bot integration",
    },
    async () =>
      repository.upsertBotIntegration({
        enabled: nextEnabled,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        ...(input.webhookSecret !== undefined
          ? {
              secretUpdatedAt: input.webhookSecret ? new Date() : null,
              webhookSecretHash: input.webhookSecret
                ? hashWebhookSecret(input.webhookSecret)
                : null,
              webhookSecretValue: input.webhookSecret,
            }
          : {}),
        webhookUrl: nextWebhookUrl,
      }),
  );
}

export async function authenticateWhatsappBotSecret(
  context: ServiceContext,
  input: AuthenticateWhatsappBotSecretInput,
  ports: CrmServicePorts,
): Promise<CrmBotIntegration> {
  const integration = await getCrmBotIntegrationRepository(
    ports,
  ).findBotIntegrationBySecretHash({
    webhookSecretHash: hashWebhookSecret(input.webhookSecret),
  });
  if (!integration?.enabled || !integration.secretConfigured) {
    throw new WhatsappBotIntegrationUnauthorizedError();
  }
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.integrations.bot.authenticate",
    category: "data_access",
    metadata: { integrationId: integration.id },
    permission: "crm.whatsapp.integrations.manage",
    storeId: integration.storeId,
    summary: "Authenticated CRM WhatsApp bot action request",
    tenantId: integration.tenantId,
  });
  return integration;
}

export class WhatsappBotIntegrationIncompleteError extends Error {
  constructor() {
    super("Bot integration requires a webhook URL and secret before enabling.");
    this.name = "WhatsappBotIntegrationIncompleteError";
  }
}

export class WhatsappBotIntegrationUnauthorizedError extends Error {
  constructor() {
    super("Bot action request is not authorized.");
    this.name = "WhatsappBotIntegrationUnauthorizedError";
  }
}

export class WhatsappBotActionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "CRM_WHATSAPP_BOT_ACTION_BLOCKED"
      | "CRM_WHATSAPP_BOT_ACTION_UNSUPPORTED"
      | "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
    readonly status: 400 | 403 | 404 | 409 | 422 = 400,
  ) {
    super(message);
    this.name = "WhatsappBotActionError";
  }
}

function defaultBotIntegration(scope: {
  storeId: string;
  tenantId: string;
}): CrmBotIntegration {
  return {
    createdAt: null,
    enabled: false,
    id: null,
    secretConfigured: false,
    secretUpdatedAt: null,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
    updatedAt: null,
    webhookUrl: null,
  };
}

function hashWebhookSecret(secret: string) {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}
