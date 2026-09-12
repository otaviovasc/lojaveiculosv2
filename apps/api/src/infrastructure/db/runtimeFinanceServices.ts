import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import {
  createFinanceServices,
  type FinanceServices,
} from "../../features/finance/controllers/financeServices.js";
import type { DrizzleFinanceClient } from "./finance/drizzleFinanceRepository.js";

export function createRuntimeFinanceServices(
  db: unknown,
  objectStorage: ObjectStorage | null,
): FinanceServices {
  return createFinanceServices({
    drizzleClient: db as DrizzleFinanceClient,
    ...(objectStorage ? { objectStorage } : {}),
  });
}
