import type {
  CrmExternalBotIntegration,
  CrmExternalBotIntegrationRepository,
  FindCrmExternalBotIntegrationInput,
} from "../../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";

type StoredExternalBotIntegration = CrmExternalBotIntegration & {
  webhookSecretHash: string | null;
  webhookSecretSealed: string | null;
};

export function createMemoryCrmExternalBotIntegrationRepository(): CrmExternalBotIntegrationRepository {
  const records: StoredExternalBotIntegration[] = [];
  return {
    findExternalBotIntegration: async (input) => findRecord(records, input),
    findExternalBotIntegrationsBySecretHash: async (input) => {
      const matches = records.filter(
        (item) =>
          item.enabled &&
          Boolean(item.webhookSecretSealed) &&
          item.webhookSecretHash === input.webhookSecretHash,
      );
      return matches.map(withoutSecrets);
    },
    findExternalBotIntegrationDeliveryConfig: async (input) => {
      const record = findStoredRecord(records, input);
      return record
        ? {
            enabled: record.enabled,
            storeId: record.storeId,
            tenantId: record.tenantId,
            webhookSecretSealed: record.webhookSecretSealed,
            webhookUrl: record.webhookUrl,
          }
        : null;
    },
    upsertExternalBotIntegration: async (input) => {
      const now = new Date();
      const current = findStoredRecord(records, input);
      const secretHash =
        input.webhookSecretHash === undefined
          ? (current?.webhookSecretHash ?? null)
          : input.webhookSecretHash;
      const secretSealed =
        input.webhookSecretSealed === undefined
          ? (current?.webhookSecretSealed ?? null)
          : input.webhookSecretSealed;
      const record: StoredExternalBotIntegration = {
        createdAt: current?.createdAt ?? now,
        enabled: input.enabled,
        id: current?.id ?? `crm_external_bot_integration_${records.length + 1}`,
        secretConfigured: Boolean(secretHash && secretSealed),
        secretUpdatedAt:
          input.webhookSecretHash === undefined
            ? (current?.secretUpdatedAt ?? null)
            : (input.secretUpdatedAt ?? null),
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
        webhookSecretHash: secretHash,
        webhookSecretSealed: secretSealed,
        webhookUrl: input.webhookUrl,
      };
      if (current) {
        records.splice(records.indexOf(current), 1, record);
      } else {
        records.push(record);
      }
      return withoutSecrets(record);
    },
  };
}

function findRecord(
  records: readonly StoredExternalBotIntegration[],
  input: FindCrmExternalBotIntegrationInput,
) {
  const record = findStoredRecord(records, input);
  return record ? withoutSecrets(record) : null;
}

function findStoredRecord(
  records: readonly StoredExternalBotIntegration[],
  input: FindCrmExternalBotIntegrationInput,
) {
  return records.find(
    (record) =>
      record.storeId === input.storeId && record.tenantId === input.tenantId,
  );
}

function withoutSecrets(
  record: StoredExternalBotIntegration,
): CrmExternalBotIntegration {
  const {
    webhookSecretHash: _webhookSecretHash,
    webhookSecretSealed: _webhookSecretSealed,
    ...safe
  } = record;
  return safe;
}
