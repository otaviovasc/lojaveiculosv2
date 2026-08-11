import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export const crmBotIntegrationProvider = "crm_whatsapp_bot";

export type CrmBotIntegration = {
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

export type CrmBotIntegrationDeliveryConfig = {
  enabled: boolean;
  storeId: StoreId;
  tenantId: TenantId;
  webhookSecretSealed: string | null;
  webhookUrl: string | null;
};

export type FindCrmBotIntegrationInput = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmBotIntegrationBySecretHashInput = {
  webhookSecretHash: string;
};

export type UpsertCrmBotIntegrationInput = FindCrmBotIntegrationInput & {
  enabled: boolean;
  secretUpdatedAt?: Date | null;
  webhookSecretHash?: string | null;
  webhookSecretSealed?: string | null;
  webhookUrl: string | null;
};

export type CrmBotIntegrationRepository = {
  findBotIntegration: (
    input: FindCrmBotIntegrationInput,
  ) => Promise<CrmBotIntegration | null>;
  findBotIntegrationsBySecretHash: (
    input: FindCrmBotIntegrationBySecretHashInput,
  ) => Promise<readonly CrmBotIntegration[]>;
  findBotIntegrationDeliveryConfig: (
    input: FindCrmBotIntegrationInput,
  ) => Promise<CrmBotIntegrationDeliveryConfig | null>;
  upsertBotIntegration: (
    input: UpsertCrmBotIntegrationInput,
  ) => Promise<CrmBotIntegration>;
};
