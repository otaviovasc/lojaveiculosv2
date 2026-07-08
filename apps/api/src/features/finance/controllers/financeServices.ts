import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { DrizzleFinanceClient } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import type { FinanceServicePorts } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import type { AttachFinanceEntryDocumentInput } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import type {
  CreateFinanceEntryInput,
  CreateFinanceEntryResult,
} from "../../../domains/finance/services/FinanceService/createFinanceEntry.js";
import type {
  FinanceEntryDetail,
  GetFinanceEntryDetailInput,
} from "../../../domains/finance/services/FinanceService/getFinanceEntryDetail.js";
import type {
  FinanceEntryListResult,
  ListFinanceEntriesInput,
} from "../../../domains/finance/services/FinanceService/listFinanceEntries.js";
import type { RequestFinanceEntryDocumentUploadInput } from "../../../domains/finance/services/FinanceService/requestFinanceEntryDocumentUpload.js";
import type { UpdateFinanceEntryInput } from "../../../domains/finance/services/FinanceService/updateFinanceEntry.js";
import type { PayFinanceEntryInput } from "../../../domains/finance/services/FinanceService/payFinanceEntry.js";
import type { CancelFinanceEntryInput } from "../../../domains/finance/services/FinanceService/cancelFinanceEntry.js";
import type { CreateFinanceRecurringEntryInput } from "../../../domains/finance/services/FinanceService/createFinanceRecurringEntry.js";
import type { ListFinanceRecurringEntriesInput } from "../../../domains/finance/services/FinanceService/listFinanceRecurringEntries.js";
import type { CreateCommissionRuleInput } from "../../../domains/finance/services/FinanceService/createCommissionRule.js";
import type { ListCommissionRulesInput } from "../../../domains/finance/services/FinanceService/listCommissionRules.js";
import type { ObjectUpload } from "../../../shared/storage/objectStorage.js";
import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import type {
  FinanceEntry,
  FinanceEntryBundle,
  FinanceEntryLink,
  FinanceRecurringEntry,
  CommissionRule,
} from "../../../domains/finance/ports/financeRepository.js";
import type { FinanceSummary } from "../../../domains/finance/services/FinanceService/getFinanceSummary.js";
import { attachFinanceEntryDocument } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import { cancelFinanceEntry } from "../../../domains/finance/services/FinanceService/cancelFinanceEntry.js";
import { createCommissionRule } from "../../../domains/finance/services/FinanceService/createCommissionRule.js";
import { createFinanceEntry } from "../../../domains/finance/services/FinanceService/createFinanceEntry.js";
import { createFinanceRecurringEntry } from "../../../domains/finance/services/FinanceService/createFinanceRecurringEntry.js";
import { getFinanceEntryDetail } from "../../../domains/finance/services/FinanceService/getFinanceEntryDetail.js";
import { getFinanceSummary } from "../../../domains/finance/services/FinanceService/getFinanceSummary.js";
import { listCommissionRules } from "../../../domains/finance/services/FinanceService/listCommissionRules.js";
import { listFinanceEntries } from "../../../domains/finance/services/FinanceService/listFinanceEntries.js";
import { listFinanceRecurringEntries } from "../../../domains/finance/services/FinanceService/listFinanceRecurringEntries.js";
import { payFinanceEntry } from "../../../domains/finance/services/FinanceService/payFinanceEntry.js";
import { requestFinanceEntryDocumentUpload } from "../../../domains/finance/services/FinanceService/requestFinanceEntryDocumentUpload.js";
import { updateFinanceEntry } from "../../../domains/finance/services/FinanceService/updateFinanceEntry.js";
import { createDrizzleFinanceRepository } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import { createDrizzleDocumentRepository } from "../../../infrastructure/db/documents/drizzleDocumentRepository.js";
import { createMemoryFinanceRepository } from "../../inventory/adapters/memory/financeRepository.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import { createTestDocumentRepository } from "../../../domains/documents/testSupportDocumentRepository.js";
import {
  createClientTransactionRunner,
  createPassthroughTransactionRunner,
  type TransactionRunner,
} from "../../../shared/transaction.js";

export type FinanceEntryListItemDto = FinanceEntry & {
  links: readonly FinanceEntryLink[];
};

export type FinanceEntryListResultDto = Omit<
  FinanceEntryListResult,
  "entries"
> & {
  entries: readonly FinanceEntryListItemDto[];
};

export type FinanceServices = {
  attachDocument: (
    context: ServiceContext,
    input: AttachFinanceEntryDocumentInput,
  ) => Promise<LinkedDocument>;
  createEntry: (
    context: ServiceContext,
    input: CreateFinanceEntryInput,
  ) => Promise<CreateFinanceEntryResult>;
  createCommissionRule: (
    context: ServiceContext,
    input: CreateCommissionRuleInput,
  ) => Promise<CommissionRule>;
  createRecurringEntry: (
    context: ServiceContext,
    input: CreateFinanceRecurringEntryInput,
  ) => Promise<FinanceRecurringEntry>;
  cancelEntry: (
    context: ServiceContext,
    input: CancelFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  deleteEntry: (
    context: ServiceContext,
    input: CancelFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  getEntry: (
    context: ServiceContext,
    input: GetFinanceEntryDetailInput,
  ) => Promise<FinanceEntryDetail>;
  getSummary: (context: ServiceContext) => Promise<FinanceSummary>;
  listEntries: (
    context: ServiceContext,
    input: ListFinanceEntriesInput,
  ) => Promise<FinanceEntryListResultDto>;
  listCommissionRules: (
    context: ServiceContext,
    input: ListCommissionRulesInput,
  ) => Promise<readonly CommissionRule[]>;
  listRecurringEntries: (
    context: ServiceContext,
    input: ListFinanceRecurringEntriesInput,
  ) => Promise<readonly FinanceRecurringEntry[]>;
  payEntry: (
    context: ServiceContext,
    input: PayFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  requestDocumentUpload: (
    context: ServiceContext,
    input: RequestFinanceEntryDocumentUploadInput,
  ) => Promise<ObjectUpload>;
  updateEntry: (
    context: ServiceContext,
    input: UpdateFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
};

export type CreateFinanceServicesOptions =
  | {
      drizzleClient?: never;
      objectStorage?: never;
      ports?: FinanceServicePorts;
      transactionRunner?: TransactionRunner<FinanceServicePorts>;
    }
  | {
      drizzleClient: DrizzleFinanceClient;
      objectStorage?: FinanceServicePorts["objectStorage"];
      ports?: never;
      transactionRunner?: TransactionRunner<FinanceServicePorts>;
    };

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
    listRecurringEntries: (context, input) =>
      listFinanceRecurringEntries(context, input, ports),
    payEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        payFinanceEntry(context, input, txPorts),
      ),
    requestDocumentUpload: (context, input) =>
      requestFinanceEntryDocumentUpload(context, input, ports),
    updateEntry: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        updateFinanceEntry(context, input, txPorts),
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

function createDrizzleFinancePorts(
  drizzleClient: DrizzleFinanceClient,
  objectStorage: FinanceServicePorts["objectStorage"] | undefined,
): FinanceServicePorts {
  return {
    documentRepository: createDrizzleDocumentRepository(drizzleClient),
    financeRepository: createDrizzleFinanceRepository(drizzleClient),
    ...(objectStorage ? { objectStorage } : {}),
  };
}

export const financeServices = createFinanceServices();
