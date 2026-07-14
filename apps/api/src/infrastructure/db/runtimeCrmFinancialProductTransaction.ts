import type { CrmRealtimePublisher } from "../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmFinancialProductTransactionRunner } from "../../features/crm/controllers/crmFinancialProducts.js";
import {
  createDrizzleFinancePorts,
  createFinanceServices,
} from "../../features/finance/controllers/financeServices.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import {
  createClientTransactionRunner,
  type TransactionCapableClient,
} from "../../shared/transaction.js";
import type { DrizzleFinanceClient } from "./finance/drizzleFinanceRepository.js";
import { createRuntimeCrmServices } from "./runtimeCrmServices.js";

export function createRuntimeCrmFinancialProductTransactionRunner(
  db: unknown,
  env: Record<string, string | undefined>,
  realtimePublisher?: CrmRealtimePublisher,
  objectStorage?: ObjectStorage | null,
): CrmFinancialProductTransactionRunner {
  return createClientTransactionRunner(
    db as TransactionCapableClient,
    (client) => {
      const crmServices = createRuntimeCrmServices(
        client,
        env,
        realtimePublisher,
        objectStorage,
      );
      const financePorts = createDrizzleFinancePorts(
        client as DrizzleFinanceClient,
        objectStorage ?? undefined,
      );
      const financeServices = createFinanceServices({ ports: financePorts });
      return {
        createActivity: crmServices.createActivity,
        materializeAutoEntries: financeServices.materializeAutoEntries,
      };
    },
  );
}
