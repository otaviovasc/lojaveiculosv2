import type {
  CrmExternalBotProfile,
  CrmExternalBotProfileRepository,
  CreateCrmExternalBotProfileInput,
  CrmExternalBotProfileScope,
  UpdateCrmExternalBotProfileInput,
} from "../../../../domains/crm/ports/crmExternalBotProfileRepository.js";

type StoredProfile = CrmExternalBotProfile & {
  apiTokenHash: string | null;
  webhookSecretHash: string | null;
  webhookSecretSealed: string | null;
};

export function createMemoryCrmExternalBotProfileRepository(
  options: {
    connectionIds?: readonly string[];
  } = {},
) {
  const profiles: StoredProfile[] = [];
  const connections = new Set(options.connectionIds ?? []);
  const assignments = new Map<string, string | null>();
  let sequence = 0;

  const repository: CrmExternalBotProfileRepository = {
    listProfiles: async (scope) => {
      return inScope(profiles, scope)
        .slice()
        .sort(
          (left, right) =>
            (left.createdAt?.getTime() ?? 0) -
            (right.createdAt?.getTime() ?? 0),
        )
        .map(withoutSecrets);
    },
    findProfile: async (input) => {
      const record = profiles.find(
        (profile) =>
          profile.storeId === input.storeId &&
          profile.tenantId === input.tenantId &&
          profile.id === input.profileId,
      );
      return record ? withoutSecrets(record) : null;
    },
    findDefaultProfile: async (scope) => {
      const record = profiles.find(
        (profile) =>
          profile.storeId === scope.storeId &&
          profile.tenantId === scope.tenantId &&
          profile.isDefault,
      );
      return record ? withoutSecrets(record) : null;
    },
    findProfileByApiTokenHash: async ({ apiTokenHash }) => {
      const matches = profiles.filter(
        (profile) => profile.enabled && profile.apiTokenHash === apiTokenHash,
      );
      return matches.length === 1 ? withoutSecrets(matches[0]!) : null;
    },
    findProfileForConnection: async (input) => {
      const record = resolveForConnection(profiles, input, assignments);
      return record && record.enabled ? withoutSecrets(record) : null;
    },
    findProfileDeliveryConfig: async (input) => {
      const record = resolveForConnection(profiles, input, assignments);
      if (!record || !record.enabled) return null;
      return {
        enabled: record.enabled,
        profileId: record.id,
        storeId: record.storeId,
        tenantId: record.tenantId,
        webhookSecretSealed: record.webhookSecretSealed,
        webhookUrl: record.webhookUrl,
      };
    },
    createProfile: async (input) => {
      const record = buildRecord(input, `profile_${++sequence}`);
      if (record.isDefault) {
        for (const profile of inScope(profiles, input)) {
          profile.isDefault = false;
        }
      }
      profiles.push(record);
      return withoutSecrets(record);
    },
    updateProfile: async (input) => {
      const record = profiles.find(
        (profile) =>
          profile.storeId === input.storeId &&
          profile.tenantId === input.tenantId &&
          profile.id === input.profileId,
      );
      if (!record) return null;
      if (input.isDefault === true) {
        for (const profile of inScope(profiles, input)) {
          if (profile.id !== record.id) profile.isDefault = false;
        }
      }
      if (input.name !== undefined) record.name = input.name;
      if (input.enabled !== undefined) record.enabled = input.enabled;
      if (input.isDefault !== undefined) record.isDefault = input.isDefault;
      if (input.webhookUrl !== undefined) record.webhookUrl = input.webhookUrl;
      if (input.apiTokenHash !== undefined) {
        record.apiTokenHash = input.apiTokenHash;
        record.apiTokenConfigured = Boolean(input.apiTokenHash);
      }
      if (input.webhookSecretHash !== undefined) {
        record.webhookSecretHash = input.webhookSecretHash;
        record.webhookSecretSealed = input.webhookSecretSealed ?? null;
        record.secretUpdatedAt = input.secretUpdatedAt ?? null;
        record.secretConfigured = Boolean(
          input.webhookSecretHash && input.webhookSecretSealed,
        );
      }
      record.updatedAt = new Date();
      return withoutSecrets(record);
    },
    assignProfileToConnection: async (input) => {
      if (input.profileId) {
        const exists = profiles.some(
          (profile) =>
            profile.storeId === input.storeId &&
            profile.tenantId === input.tenantId &&
            profile.id === input.profileId,
        );
        if (!exists) return { kind: "profile_not_found" };
      }
      if (!connections.has(input.connectionId)) {
        return { kind: "connection_not_found" };
      }
      assignments.set(input.connectionId, input.profileId);
      return { kind: "assigned" };
    },
    listConnectionProfileAssignments: async (scope) => {
      const results: { connectionId: string; profileId: string | null }[] = [];
      for (const connectionId of connections) {
        results.push({
          connectionId,
          profileId: assignments.get(connectionId) ?? null,
        });
      }
      return results;
    },
  };

  return repository;
}

function buildRecord(
  input: CreateCrmExternalBotProfileInput,
  id: string,
): StoredProfile {
  const now = new Date();
  return {
    apiTokenConfigured: Boolean(input.apiTokenHash),
    apiTokenHash: input.apiTokenHash,
    createdAt: now,
    enabled: input.enabled,
    id,
    isDefault: input.isDefault,
    name: input.name,
    secretConfigured: Boolean(
      input.webhookSecretHash && input.webhookSecretSealed,
    ),
    secretUpdatedAt: input.secretUpdatedAt,
    storeId: input.storeId,
    tenantId: input.tenantId,
    updatedAt: now,
    webhookSecretHash: input.webhookSecretHash,
    webhookSecretSealed: input.webhookSecretSealed,
    webhookUrl: input.webhookUrl,
  };
}

function inScope(
  profiles: readonly StoredProfile[],
  scope: CrmExternalBotProfileScope,
) {
  return profiles.filter(
    (profile) =>
      profile.storeId === scope.storeId && profile.tenantId === scope.tenantId,
  );
}

function resolveForConnection(
  profiles: readonly StoredProfile[],
  input: CrmExternalBotProfileScope & { connectionId: string },
  assignments: ReadonlyMap<string, string | null>,
) {
  const explicitId = assignments.get(input.connectionId) ?? null;
  if (explicitId) {
    return (
      profiles.find(
        (profile) =>
          profile.storeId === input.storeId &&
          profile.tenantId === input.tenantId &&
          profile.id === explicitId,
      ) ?? null
    );
  }
  return (
    profiles.find(
      (profile) =>
        profile.storeId === input.storeId &&
        profile.tenantId === input.tenantId &&
        profile.isDefault,
    ) ?? null
  );
}

function withoutSecrets(record: StoredProfile): CrmExternalBotProfile {
  const {
    apiTokenHash: _apiTokenHash,
    webhookSecretHash: _webhookSecretHash,
    webhookSecretSealed: _webhookSecretSealed,
    ...safe
  } = record;
  return safe;
}
