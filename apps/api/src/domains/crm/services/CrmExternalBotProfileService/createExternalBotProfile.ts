import { assertAnyPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmExternalBotProfile } from "../../ports/crmExternalBotProfileRepository.js";
import { CRM_EXTERNAL_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import {
  hashExternalBotApiToken,
  hashWebhookSecret,
  normalizeExternalBotApiTokenUpdate,
  normalizeWebhookSecretUpdate,
  normalizeWebhookUrlUpdate,
} from "../../bot/externalBotIntegrationValidation.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { CrmExternalBotProfileIncompleteError } from "../../errors/crmExternalBotProfileErrors.js";
import {
  botProfileManagePermissions,
  getCrmExternalBotProfileRepository,
  requireCrmExternalBotProfileScope,
} from "./serviceSupport.js";

export type CreateExternalBotProfileInput = {
  name: string;
  enabled?: boolean;
  isDefault?: boolean;
  webhookUrl?: string | null;
  apiToken?: string | null;
  webhookSecret?: string | null;
};

export async function createExternalBotProfile(
  context: ServiceContext,
  input: CreateExternalBotProfileInput,
  ports: CrmServicePorts,
): Promise<CrmExternalBotProfile> {
  const permission = assertAnyPermission(context, botProfileManagePermissions);
  const scope = requireCrmExternalBotProfileScope(context);
  const repository = getCrmExternalBotProfileRepository(ports);
  const nextEnabled = input.enabled ?? false;
  const nextWebhookUrl = normalizeWebhookUrlUpdate(input.webhookUrl, null);
  const apiTokenUpdate = normalizeExternalBotApiTokenUpdate(input.apiToken);
  const webhookSecretUpdate = normalizeWebhookSecretUpdate(input.webhookSecret);
  const nextSecretConfigured = Boolean(webhookSecretUpdate);
  if (nextEnabled && (!nextWebhookUrl || !nextSecretConfigured)) {
    throw new CrmExternalBotProfileIncompleteError();
  }
  logCrmServiceEvent(context, "crm.external_bot.profile.create.start", {
    enabled: nextEnabled,
    name: input.name.trim(),
    secretChanged: webhookSecretUpdate !== undefined,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.external_bot.profile.create",
      category: "data_change",
      entityType: "crm_external_bot_profile",
      metadata: {
        apiTokenConfigured: apiTokenUpdate !== undefined,
        enabled: nextEnabled,
        permission,
        secretConfigured: nextSecretConfigured,
        webhookConfigured: Boolean(nextWebhookUrl),
      },
      permission,
      summary: "Created CRM external bot profile",
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
          : null;
      return repository.createProfile({
        enabled: nextEnabled,
        isDefault: input.isDefault ?? false,
        name: input.name.trim(),
        apiTokenHash: apiTokenUpdate
          ? hashExternalBotApiToken(apiTokenUpdate)
          : null,
        secretUpdatedAt: webhookSecretUpdate ? new Date() : null,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        webhookSecretHash: webhookSecretUpdate
          ? hashWebhookSecret(webhookSecretUpdate)
          : null,
        webhookSecretSealed: sealedWebhookSecret,
        webhookUrl: nextWebhookUrl,
      });
    },
  );
}
