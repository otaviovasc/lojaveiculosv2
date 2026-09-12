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
import {
  CrmExternalBotProfileIncompleteError,
  CrmExternalBotProfileNotFoundError,
} from "../../errors/crmExternalBotProfileErrors.js";
import {
  botProfileManagePermissions,
  getCrmExternalBotProfileRepository,
  requireCrmExternalBotProfileScope,
} from "./serviceSupport.js";

export type UpdateExternalBotProfileInput = {
  profileId: string;
  name?: string;
  enabled?: boolean;
  isDefault?: boolean;
  webhookUrl?: string | null;
  apiToken?: string | null;
  webhookSecret?: string | null;
};

export async function updateExternalBotProfile(
  context: ServiceContext,
  input: UpdateExternalBotProfileInput,
  ports: CrmServicePorts,
): Promise<CrmExternalBotProfile> {
  const permission = assertAnyPermission(context, botProfileManagePermissions);
  const scope = requireCrmExternalBotProfileScope(context);
  const repository = getCrmExternalBotProfileRepository(ports);
  const current = await repository.findProfile({
    profileId: input.profileId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!current) throw new CrmExternalBotProfileNotFoundError();
  const nextEnabled = input.enabled ?? current.enabled;
  const nextWebhookUrl = normalizeWebhookUrlUpdate(
    input.webhookUrl,
    current.webhookUrl,
  );
  const apiTokenUpdate = normalizeExternalBotApiTokenUpdate(input.apiToken);
  const webhookSecretUpdate = normalizeWebhookSecretUpdate(input.webhookSecret);
  const nextSecretConfigured =
    webhookSecretUpdate === undefined
      ? current.secretConfigured
      : Boolean(webhookSecretUpdate);
  if (nextEnabled && (!nextWebhookUrl || !nextSecretConfigured)) {
    throw new CrmExternalBotProfileIncompleteError();
  }
  logCrmServiceEvent(context, "crm.external_bot.profile.update.start", {
    apiTokenChanged: apiTokenUpdate !== undefined,
    enabled: nextEnabled,
    profileId: input.profileId,
    secretChanged: webhookSecretUpdate !== undefined,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.external_bot.profile.update",
      category: "data_change",
      entityId: input.profileId,
      entityType: "crm_external_bot_profile",
      metadata: {
        apiTokenChanged: apiTokenUpdate !== undefined,
        apiTokenCleared: apiTokenUpdate === null,
        enabled: nextEnabled,
        permission,
        secretChanged: webhookSecretUpdate !== undefined,
        webhookConfigured: Boolean(nextWebhookUrl),
      },
      permission,
      summary: "Updated CRM external bot profile",
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
      const updated = await repository.updateProfile({
        profileId: input.profileId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        enabled: nextEnabled,
        webhookUrl: nextWebhookUrl,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.isDefault !== undefined
          ? { isDefault: input.isDefault }
          : {}),
        ...(apiTokenUpdate !== undefined
          ? {
              apiTokenHash: apiTokenUpdate
                ? hashExternalBotApiToken(apiTokenUpdate)
                : null,
            }
          : {}),
        ...(webhookSecretUpdate !== undefined
          ? {
              secretUpdatedAt: webhookSecretUpdate ? new Date() : null,
              webhookSecretHash: webhookSecretUpdate
                ? hashWebhookSecret(webhookSecretUpdate)
                : null,
              webhookSecretSealed: sealedWebhookSecret ?? null,
            }
          : {}),
      });
      if (!updated) throw new CrmExternalBotProfileNotFoundError();
      return updated;
    },
  );
}
