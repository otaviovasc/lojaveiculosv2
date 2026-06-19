import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreSettingsRepository } from "../../ports/storeSettingsRepository.js";

export type StoreSettingsServicePorts = {
  storeSettingsRepository: StoreSettingsRepository;
};

export class StoreSettingsNotFoundError extends Error {
  constructor(storeId: string) {
    super(`Store settings not found: ${storeId}`);
    this.name = "StoreSettingsNotFoundError";
  }
}

export class StoreSettingsScopeError extends Error {
  constructor(fieldName: string) {
    super(`Store settings service requires ${fieldName}.`);
    this.name = "StoreSettingsScopeError";
  }
}

export function requireStoreSettingsScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new StoreSettingsScopeError("storeId");
  if (!context.tenantId) throw new StoreSettingsScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}
