import { assertAnyPermission } from "../../../../shared/authorization.js";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmExternalBotIntegration } from "../../ports/crmExternalBotIntegrationRepository.js";
import { CRM_EXTERNAL_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import {
  getCrmExternalBotIntegrationRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  hashWebhookSecret,
  normalizeWebhookSecretUpdate,
  normalizeWebhookUrlUpdate,
  ExternalBotIntegrationValidationError,
} from "../../bot/externalBotIntegrationValidation.js";

export { ExternalBotIntegrationValidationError };

const botReadPermissions = [
  "crm.bot.read",
  "crm.bot.manage",
] as const satisfies readonly PermissionKey[];
const botManagePermissions = [
  "crm.bot.manage",
] as const satisfies readonly PermissionKey[];

export type UpdateExternalBotIntegrationInput = {
  enabled?: boolean;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
};

export async function getExternalBotIntegration(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<CrmExternalBotIntegration> {
  const permission = assertAnyPermission(context, botReadPermissions);
  const scope = requireCrmScope(context);
  logCrmServiceEvent(context, "crm.external_bot.integration.read.start");
  const integration = await getCrmExternalBotIntegrationRepository(
    ports,
  ).findExternalBotIntegration({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.external_bot.integration.read",
    category: "data_access",
    metadata: { configured: Boolean(integration?.webhookUrl) },
    permission,
    summary: "Read CRM external bot integration",
  });
  return integration ?? defaultExternalBotIntegration(scope);
}

export async function updateExternalBotIntegration(
  context: ServiceContext,
  input: UpdateExternalBotIntegrationInput,
  ports: CrmServicePorts,
): Promise<CrmExternalBotIntegration> {
  const permission = assertAnyPermission(context, botManagePermissions);
  const scope = requireCrmScope(context);
  const repository = getCrmExternalBotIntegrationRepository(ports);
  const webhookSecretUpdate = normalizeWebhookSecretUpdate(input.webhookSecret);
  const current =
    (await repository.findExternalBotIntegration({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })) ?? defaultExternalBotIntegration(scope);
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
    throw new ExternalBotIntegrationIncompleteError();
  }

  logCrmServiceEvent(context, "crm.external_bot.integration.update.start", {
    enabled: nextEnabled,
    secretChanged: webhookSecretUpdate !== undefined,
    webhookConfigured: Boolean(nextWebhookUrl),
  });

  return recordCrmServiceMutation(
    context,
    {
      action: "crm.external_bot.integration.update",
      category: "data_change",
      entityType: "crm_external_bot_integration",
      metadata: {
        enabled: nextEnabled,
        permission,
        secretChanged: webhookSecretUpdate !== undefined,
        webhookConfigured: Boolean(nextWebhookUrl),
      },
      permission,
      summary: "Updated CRM external bot integration",
    },
    async () => {
      const sealedWebhookSecret =
        typeof webhookSecretUpdate === "string"
          ? await getCrmConnectionCredentialVault(ports).seal({
              plaintext: webhookSecretUpdate,
              purpose: CRM_EXTERNAL_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
              storeId: scope.storeId as never,
              tenantId: scope.tenantId as never,
            })
          : webhookSecretUpdate;
      return repository.upsertExternalBotIntegration({
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

export class ExternalBotIntegrationIncompleteError extends Error {
  constructor() {
    super("Bot integration requires a webhook URL and secret before enabling.");
    this.name = "ExternalBotIntegrationIncompleteError";
  }
}

function defaultExternalBotIntegration(scope: {
  storeId: string;
  tenantId: string;
}): CrmExternalBotIntegration {
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
