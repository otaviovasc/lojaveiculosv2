import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export const crmExternalBotIntegrationProvider = "crm_external_bot";

export type CrmExternalBotIntegration = {
  createdAt: Date | null;
  enabled: boolean;
  id: string | null;
  secretConfigured: boolean;
  secretUpdatedAt: Date | null;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date | null;
  webhookUrl: string | null;
};

export type CrmExternalBotIntegrationDeliveryConfig = {
  enabled: boolean;
  storeId: StoreId;
  tenantId: TenantId;
  webhookSecretSealed: string | null;
  webhookUrl: string | null;
};

export type FindCrmExternalBotIntegrationInput = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmExternalBotIntegrationBySecretHashInput = {
  webhookSecretHash: string;
};

export type UpsertCrmExternalBotIntegrationInput =
  FindCrmExternalBotIntegrationInput & {
    enabled: boolean;
    secretUpdatedAt?: Date | null;
    webhookSecretHash?: string | null;
    webhookSecretSealed?: string | null;
    webhookUrl: string | null;
  };

export type CrmExternalBotIntegrationRepository = {
  findExternalBotIntegration: (
    input: FindCrmExternalBotIntegrationInput,
  ) => Promise<CrmExternalBotIntegration | null>;
  findExternalBotIntegrationsBySecretHash: (
    input: FindCrmExternalBotIntegrationBySecretHashInput,
  ) => Promise<readonly CrmExternalBotIntegration[]>;
  findExternalBotIntegrationDeliveryConfig: (
    input: FindCrmExternalBotIntegrationInput,
  ) => Promise<CrmExternalBotIntegrationDeliveryConfig | null>;
  upsertExternalBotIntegration: (
    input: UpsertCrmExternalBotIntegrationInput,
  ) => Promise<CrmExternalBotIntegration>;
};
