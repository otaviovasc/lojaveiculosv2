import type { DrizzleFinanceClient } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import type { FinanceServicePorts } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import type {
  CreateFinanceServicesOptions,
  FinanceServices,
} from "./financeServiceContracts.js";
import { attachFinanceEntryDocument } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import { cancelFinanceEntry } from "../../../domains/finance/services/FinanceService/cancelFinanceEntry.js";
import { createCommissionRule } from "../../../domains/finance/services/FinanceService/createCommissionRule.js";
import { createFinanceAutoEntryRule } from "../../../domains/finance/services/FinanceService/createFinanceAutoEntryRule.js";
import { deactivateFinanceAutoEntryRule } from "../../../domains/finance/services/FinanceService/deactivateFinanceAutoEntryRule.js";
import { createFinanceEntry } from "../../../domains/finance/services/FinanceService/createFinanceEntry.js";
import { createFinanceRecurringEntry } from "../../../domains/finance/services/FinanceService/createFinanceRecurringEntry.js";
import { getFinanceEntryDetail } from "../../../domains/finance/services/FinanceService/getFinanceEntryDetail.js";
import { getFinanceSummary } from "../../../domains/finance/services/FinanceService/getFinanceSummary.js";
import { listCommissionRules } from "../../../domains/finance/services/FinanceService/listCommissionRules.js";
import { listFinanceAutoEntryRules } from "../../../domains/finance/services/FinanceService/listFinanceAutoEntryRules.js";
import { listFinanceEntries } from "../../../domains/finance/services/FinanceService/listFinanceEntries.js";
import { listFinanceRecurringEntries } from "../../../domains/finance/services/FinanceService/listFinanceRecurringEntries.js";
import { payFinanceEntry } from "../../../domains/finance/services/FinanceService/payFinanceEntry.js";
import { requestFinanceEntryDocumentUpload } from "../../../domains/finance/services/FinanceService/requestFinanceEntryDocumentUpload.js";
import { updateFinanceEntry } from "../../../domains/finance/services/FinanceService/updateFinanceEntry.js";
import { updateFinanceAutoEntryRule } from "../../../domains/finance/services/FinanceService/updateFinanceAutoEntryRule.js";
import { materializeFinanceAutoEntries } from "../../../domains/finance/services/FinanceService/materializeFinanceAutoEntries.js";
import { createDrizzleFinanceRepository } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import { createDrizzleFinanceAutoEntryRepository } from "../../../infrastructure/db/finance/drizzleFinanceAutoEntryRepository.js";
import { createDrizzleDocumentRepository } from "../../../infrastructure/db/documents/drizzleDocumentRepository.js";
import { createMemoryFinanceRepository } from "../../inventory/adapters/memory/financeRepository.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import { createTestDocumentRepository } from "../../../domains/documents/testSupportDocumentRepository.js";
import { createTestFinanceAutoEntryRepository } from "../../../domains/finance/testSupportFinanceAutoEntryRepository.js";
import {
  createClientTransactionRunner,
  createPassthroughTransactionRunner,
  type TransactionRunner,
} from "../../../shared/transaction.js";

export type {
  CreateFinanceServicesOptions,
  FinanceEntryListItemDto,
  FinanceEntryListResultDto,
  FinanceServices,
} from "./financeServiceContracts.js";

export function createFinanceServices(
  options: CreateFinanceServicesOptions = {},
): FinanceServices {
  const ports = resolveFinancePorts(options);
  const transactionRunner = resolveFinanceTransactionRunner(options, ports);

  return {
    attachDocument: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        attachFinanceEntryDocument(context, input, txPorts),
      ),
    cancelEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        cancelFinanceEntry(context, input, txPorts),
      ),
    createAutoEntryRule: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        createFinanceAutoEntryRule(context, input, txPorts),
      ),
    createCommissionRule: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        createCommissionRule(context, input, txPorts),
      ),
    createEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        createFinanceEntry(context, input, txPorts),
      ),
    createRecurringEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        createFinanceRecurringEntry(context, input, txPorts),
      ),
    deleteEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        cancelFinanceEntry(context, input, txPorts),
      ),
    deactivateAutoEntryRule: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        deactivateFinanceAutoEntryRule(context, input, txPorts),
      ),
    getEntry: (context, input) => getFinanceEntryDetail(context, input, ports),
    getSummary: (context) => getFinanceSummary(context, ports),
    async listEntries(context, input) {
      const result = await listFinanceEntries(context, input, ports);
      return {
        ...result,
        entries: result.entries.map((bundle) => ({
          ...bundle.entry,
          links: bundle.links,
        })),
      };
    },
    listCommissionRules: (context, input) =>
      listCommissionRules(context, input, ports),
    listAutoEntryRules: (context, input) =>
      listFinanceAutoEntryRules(context, input, ports),
    listRecurringEntries: (context, input) =>
      listFinanceRecurringEntries(context, input, ports),
    payEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        payFinanceEntry(context, input, txPorts),
      ),
    materializeAutoEntries: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        materializeFinanceAutoEntries(context, input, txPorts),
      ),
    requestDocumentUpload: (context, input) =>
      requestFinanceEntryDocumentUpload(context, input, ports),
    updateEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        updateFinanceEntry(context, input, txPorts),
      ),
    updateAutoEntryRule: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        updateFinanceAutoEntryRule(context, input, txPorts),
      ),
  };
}

function resolveFinancePorts(
  options: CreateFinanceServicesOptions,
): FinanceServicePorts {
  if ("ports" in options && options.ports) return options.ports;

  if ("drizzleClient" in options) {
    return createDrizzleFinancePorts(
      options.drizzleClient,
      options.objectStorage,
    );
  }

  return {
    documentRepository: createTestDocumentRepository(),
    financeAutoEntryRepository: createTestFinanceAutoEntryRepository(),
    financeRepository: createMemoryFinanceRepository(),
    objectStorage: createMemoryObjectStorage(),
  };
}

function resolveFinanceTransactionRunner(
  options: CreateFinanceServicesOptions,
  ports: FinanceServicePorts,
): TransactionRunner<FinanceServicePorts> {
  if (options.transactionRunner) return options.transactionRunner;
  if ("drizzleClient" in options) {
    return createClientTransactionRunner<
      FinanceServicePorts,
      DrizzleFinanceClient
    >(options.drizzleClient, (client) =>
      createDrizzleFinancePorts(client, options.objectStorage),
    );
  }
  return createPassthroughTransactionRunner(ports);
}

export function createDrizzleFinancePorts(
  drizzleClient: DrizzleFinanceClient,
  objectStorage: FinanceServicePorts["objectStorage"] | undefined,
): FinanceServicePorts {
  return {
    documentRepository: createDrizzleDocumentRepository(drizzleClient),
    financeAutoEntryRepository:
      createDrizzleFinanceAutoEntryRepository(drizzleClient),
    financeRepository: createDrizzleFinanceRepository(drizzleClient),
    ...(objectStorage ? { objectStorage } : {}),
  };
}

export const financeServices = createFinanceServices();
