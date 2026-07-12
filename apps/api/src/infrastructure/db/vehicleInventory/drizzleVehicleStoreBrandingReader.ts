import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { VehicleStoreBrandingReader } from "../../../domains/vehicle/ports/vehicleStoreBrandingReader.js";
import { createDrizzleStoreSettingsRepository } from "../settings/drizzleStoreSettingsRepository.js";
import type { DrizzleVehicleInventoryClient } from "./drizzleVehicleInventoryRepository.js";

export function createDrizzleVehicleStoreBrandingReader(
  db: DrizzleVehicleInventoryClient,
): VehicleStoreBrandingReader {
  const repository = createDrizzleStoreSettingsRepository(db);
  return {
    async findByStore(input) {
      const settings = await repository.findByStore({
        storeId: input.storeId as StoreId,
        tenantId: input.tenantId as TenantId,
      });
      if (!settings) return null;
      const phone =
        settings.profile.whatsappPhone ?? settings.profile.contactPhone;
      const address = joinText([
        settings.profile.addressLine1,
        settings.profile.addressLine2,
        settings.profile.addressCity,
        settings.profile.addressState,
        settings.profile.addressZipCode,
      ]);
      const contactLine = joinText([phone, settings.profile.contactEmail]);
      return {
        address,
        contactLine,
        document: settings.profile.documentNumber,
        email: settings.profile.contactEmail,
        name: settings.identity.tradingName,
        phone,
      };
    },
  };
}

function joinText(values: readonly (string | null)[]) {
  const text = values.filter((value): value is string =>
    Boolean(value?.trim()),
  );
  return text.length ? text.join(" · ") : null;
}
