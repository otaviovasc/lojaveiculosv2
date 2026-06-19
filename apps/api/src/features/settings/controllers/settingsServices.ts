import type { ServiceContext } from "../../../shared/serviceContext.js";
import { getStoreSettings } from "../../../domains/settings/services/StoreSettingsService/getStoreSettings.js";
import { updateStoreSettings } from "../../../domains/settings/services/StoreSettingsService/updateStoreSettings.js";
import type { UpdateStoreSettingsServiceInput } from "../../../domains/settings/services/StoreSettingsService/updateStoreSettings.js";
import type { StoreSettingsSnapshot } from "../../../domains/settings/ports/storeSettingsRepository.js";
import type { StoreSettingsServicePorts } from "../../../domains/settings/services/StoreSettingsService/serviceSupport.js";
import { createMemoryStoreSettingsRepository } from "../adapters/memory/storeSettingsRepository.js";
import {
  createDrizzleStoreSettingsRepository,
  type DrizzleStoreSettingsClient,
} from "../../../infrastructure/db/settings/drizzleStoreSettingsRepository.js";

export type SettingsServices = {
  getStoreSettings: (context: ServiceContext) => Promise<StoreSettingsSnapshot>;
  updateStoreSettings: (
    context: ServiceContext,
    input: UpdateStoreSettingsServiceInput,
  ) => Promise<StoreSettingsSnapshot>;
};

export type CreateSettingsServicesOptions =
  | { drizzleClient?: never; ports?: StoreSettingsServicePorts }
  | { drizzleClient: DrizzleStoreSettingsClient; ports?: never };

export function createSettingsServices(
  options: CreateSettingsServicesOptions = {},
): SettingsServices {
  const ports = resolvePorts(options);

  return {
    getStoreSettings: (context) => getStoreSettings(context, ports),
    updateStoreSettings: (context, input) =>
      updateStoreSettings(context, input, ports),
  };
}

function resolvePorts(
  options: CreateSettingsServicesOptions,
): StoreSettingsServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options) {
    return {
      storeSettingsRepository: createDrizzleStoreSettingsRepository(
        options.drizzleClient,
      ),
    };
  }

  return { storeSettingsRepository: createMemoryStoreSettingsRepository() };
}

export const settingsServices = createSettingsServices();
