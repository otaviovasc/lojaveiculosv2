import { createHash } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmBotIntegration } from "../../ports/crmBotIntegrationRepository.js";
import {
  getCrmBotIntegrationRepository,
  requireCrmScope,
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

export async function getWhatsappBotIntegration(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmBotIntegration> {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
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
  const scope = requireCrmScope(context);
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
            }
          : {}),
        webhookUrl: nextWebhookUrl,
      }),
  );
}

export class WhatsappBotIntegrationIncompleteError extends Error {
  constructor() {
    super("Bot integration requires a webhook URL and secret before enabling.");
    this.name = "WhatsappBotIntegrationIncompleteError";
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
