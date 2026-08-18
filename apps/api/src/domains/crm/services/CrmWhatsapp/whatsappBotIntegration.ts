import { assertAnyPermission } from "../../../../shared/authorization.js";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmBotIntegration } from "../../ports/crmBotIntegrationRepository.js";
import { CRM_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import {
  getCrmBotIntegrationRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  hashWebhookSecret,
  normalizeWebhookSecretUpdate,
  normalizeWebhookUrlUpdate,
  WhatsappBotIntegrationValidationError,
} from "../../whatsapp/whatsappBotIntegrationValidation.js";

export { WhatsappBotIntegrationValidationError };

const botReadPermissions = [
  "crm.bot.read",
  "crm.bot.manage",
  "crm.whatsapp.integrations.manage",
] as const satisfies readonly PermissionKey[];
const botManagePermissions = [
  "crm.bot.manage",
  "crm.whatsapp.integrations.manage",
] as const satisfies readonly PermissionKey[];

export type UpdateWhatsappBotIntegrationInput = {
  enabled?: boolean;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
};

export async function getWhatsappBotIntegration(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmBotIntegration> {
  const permission = assertAnyPermission(context, botReadPermissions);
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
  const permission = assertAnyPermission(context, botManagePermissions);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmBotIntegrationRepository(ports);
  const webhookSecretUpdate = normalizeWebhookSecretUpdate(input.webhookSecret);
  const current =
    (await repository.findBotIntegration({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })) ?? defaultBotIntegration(scope);
  const nextEnabled = input.enabled ?? current.enabled;
  const nextWebhookUrl = normalizeWebhookUrlUpdate(
    input.webhookUrl,
    current.webhookUrl,
  );
  const nextSecretConfigured =
    webhookSecretUpdate === undefined
      ? current.secretConfigured
      : Boolean(webhookSecretUpdate);

  if (nextEnabled && (!nextWebhookUrl || !nextSecretConfigured)) {
    throw new WhatsappBotIntegrationIncompleteError();
  }

  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.integrations.bot.update.start",
    {
      enabled: nextEnabled,
      secretChanged: webhookSecretUpdate !== undefined,
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
        secretChanged: webhookSecretUpdate !== undefined,
        webhookConfigured: Boolean(nextWebhookUrl),
      },
      permission,
      summary: "Updated CRM WhatsApp bot integration",
    },
    async () => {
      const sealedWebhookSecret =
        typeof webhookSecretUpdate === "string"
          ? await getCrmConnectionCredentialVault(ports).seal({
              plaintext: webhookSecretUpdate,
              purpose: CRM_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
              storeId: scope.storeId as never,
              tenantId: scope.tenantId as never,
            })
          : webhookSecretUpdate;
      return repository.upsertBotIntegration({
        enabled: nextEnabled,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        ...(webhookSecretUpdate !== undefined
          ? {
              secretUpdatedAt: webhookSecretUpdate ? new Date() : null,
              webhookSecretHash: webhookSecretUpdate
                ? hashWebhookSecret(webhookSecretUpdate)
                : null,
              webhookSecretSealed: sealedWebhookSecret ?? null,
            }
          : {}),
        webhookUrl: nextWebhookUrl,
      });
    },
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
