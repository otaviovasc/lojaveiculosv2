import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { FinanceStoreIdentityReader } from "../../../domains/finance/ports/financeStoreIdentityReader.js";
import { createDrizzleStoreSettingsRepository } from "../settings/drizzleStoreSettingsRepository.js";
import type { DrizzleFinanceClient } from "./drizzleFinanceRepository.js";

export function createDrizzleFinanceStoreIdentityReader(
  db: DrizzleFinanceClient,
): FinanceStoreIdentityReader {
  const repository = createDrizzleStoreSettingsRepository(db);
  return {
    async findByStore(input) {
      const settings = await repository.findByStore({
        storeId: input.storeId as StoreId,
        tenantId: input.tenantId as TenantId,
      });
      const name =
        settings?.identity.tradingName.trim() ||
        settings?.identity.legalName?.trim();
      return name ? { name } : null;
    },
  };
}
