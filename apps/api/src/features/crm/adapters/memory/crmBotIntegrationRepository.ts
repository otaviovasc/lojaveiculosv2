import type {
  CrmBotIntegration,
  CrmBotIntegrationRepository,
  FindCrmBotIntegrationInput,
  UpsertCrmBotIntegrationInput,
} from "../../../../domains/crm/ports/crmBotIntegrationRepository.js";

type StoredBotIntegration = CrmBotIntegration & {
  webhookSecretHash: string | null;
};

export function createMemoryCrmBotIntegrationRepository(): CrmBotIntegrationRepository {
  const records: StoredBotIntegration[] = [];
  return {
    findBotIntegration: async (input) => findRecord(records, input),
    findBotIntegrationBySecretHash: async (input) => {
      const record = records.find(
        (item) =>
          item.enabled && item.webhookSecretHash === input.webhookSecretHash,
      );
      return record ? withoutSecretHash(record) : null;
    },
    upsertBotIntegration: async (input) => {
      const now = new Date();
      const current = findStoredRecord(records, input);
      const secretHash =
        input.webhookSecretHash === undefined
          ? (current?.webhookSecretHash ?? null)
          : input.webhookSecretHash;
      const record: StoredBotIntegration = {
        createdAt: current?.createdAt ?? now,
        enabled: input.enabled,
        id: current?.id ?? `crm_bot_integration_${records.length + 1}`,
        secretConfigured: Boolean(secretHash),
        secretUpdatedAt:
          input.webhookSecretHash === undefined
            ? (current?.secretUpdatedAt ?? null)
            : (input.secretUpdatedAt ?? null),
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
        webhookSecretHash: secretHash,
        webhookUrl: input.webhookUrl,
      };
      if (current) {
        records.splice(records.indexOf(current), 1, record);
      } else {
        records.push(record);
      }
      return withoutSecretHash(record);
    },
  };
}

function findRecord(
  records: readonly StoredBotIntegration[],
  input: FindCrmBotIntegrationInput,
) {
  const record = findStoredRecord(records, input);
  return record ? withoutSecretHash(record) : null;
}

function findStoredRecord(
  records: readonly StoredBotIntegration[],
  input: FindCrmBotIntegrationInput,
) {
  return records.find(
    (record) =>
      record.storeId === input.storeId && record.tenantId === input.tenantId,
  );
}

function withoutSecretHash(record: StoredBotIntegration): CrmBotIntegration {
  const { webhookSecretHash: _webhookSecretHash, ...safe } = record;
  return safe;
}
