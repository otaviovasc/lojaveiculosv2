import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type CrmExternalBotProfile = {
  id: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  apiTokenConfigured: boolean;
  secretConfigured: boolean;
  secretUpdatedAt: Date | null;
  webhookUrl: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CrmExternalBotProfileDeliveryConfig = {
  enabled: boolean;
  profileId: string;
  storeId: StoreId;
  tenantId: TenantId;
  webhookSecretSealed: string | null;
  webhookUrl: string | null;
};

export type CrmExternalBotProfileScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateCrmExternalBotProfileInput = CrmExternalBotProfileScope & {
  name: string;
  enabled: boolean;
  isDefault: boolean;
  apiTokenHash: string | null;
  webhookSecretHash: string | null;
  webhookSecretSealed: string | null;
  secretUpdatedAt: Date | null;
  webhookUrl: string | null;
};

export type UpdateCrmExternalBotProfileInput = CrmExternalBotProfileScope & {
  profileId: string;
  name?: string;
  enabled?: boolean;
  isDefault?: boolean;
  apiTokenHash?: string | null;
  webhookSecretHash?: string | null;
  webhookSecretSealed?: string | null;
  secretUpdatedAt?: Date | null;
  webhookUrl?: string | null;
};

export type CrmExternalBotProfileConnectionAssignment = {
  connectionId: string;
  profileId: string | null;
};

export type CrmExternalBotProfileRepository = {
  listProfiles: (
    scope: CrmExternalBotProfileScope,
  ) => Promise<readonly CrmExternalBotProfile[]>;
  findProfile: (
    scope: CrmExternalBotProfileScope & { profileId: string },
  ) => Promise<CrmExternalBotProfile | null>;
  findDefaultProfile: (
    scope: CrmExternalBotProfileScope,
  ) => Promise<CrmExternalBotProfile | null>;
  findProfileByApiTokenHash: (input: {
    apiTokenHash: string;
  }) => Promise<CrmExternalBotProfile | null>;
  findProfileForConnection: (
    scope: CrmExternalBotProfileScope & { connectionId: string },
  ) => Promise<CrmExternalBotProfile | null>;
  findProfileDeliveryConfig: (
    scope: CrmExternalBotProfileScope & { connectionId: string },
  ) => Promise<CrmExternalBotProfileDeliveryConfig | null>;
  createProfile: (
    input: CreateCrmExternalBotProfileInput,
  ) => Promise<CrmExternalBotProfile>;
  updateProfile: (
    input: UpdateCrmExternalBotProfileInput,
  ) => Promise<CrmExternalBotProfile | null>;
  assignProfileToConnection: (
    input: CrmExternalBotProfileScope & {
      connectionId: string;
      profileId: string | null;
    },
  ) => Promise<
    | { kind: "assigned" }
    | { kind: "connection_not_found" }
    | { kind: "profile_not_found" }
  >;
  listConnectionProfileAssignments: (
    scope: CrmExternalBotProfileScope,
  ) => Promise<readonly CrmExternalBotProfileConnectionAssignment[]>;
};
