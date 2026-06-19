import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { DrizzleFinanceClient } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import type { FinanceServicePorts } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import type { AttachFinanceEntryDocumentInput } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import type { CreateFinanceEntryInput } from "../../../domains/finance/services/FinanceService/createFinanceEntry.js";
import type { ListFinanceEntriesInput } from "../../../domains/finance/services/FinanceService/listFinanceEntries.js";
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
  FinanceRecurringEntry,
  CommissionRule,
} from "../../../domains/finance/ports/financeRepository.js";
import type { FinanceSummary } from "../../../domains/finance/services/FinanceService/getFinanceSummary.js";
import { attachFinanceEntryDocument } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import { cancelFinanceEntry } from "../../../domains/finance/services/FinanceService/cancelFinanceEntry.js";
import { createCommissionRule } from "../../../domains/finance/services/FinanceService/createCommissionRule.js";
import { createFinanceEntry } from "../../../domains/finance/services/FinanceService/createFinanceEntry.js";
import { createFinanceRecurringEntry } from "../../../domains/finance/services/FinanceService/createFinanceRecurringEntry.js";
import { getFinanceSummary } from "../../../domains/finance/services/FinanceService/getFinanceSummary.js";
import { listCommissionRules } from "../../../domains/finance/services/FinanceService/listCommissionRules.js";
import { listFinanceEntries } from "../../../domains/finance/services/FinanceService/listFinanceEntries.js";
import { listFinanceEntriesByTarget } from "../../../domains/finance/services/FinanceService/listFinanceEntriesByTarget.js";
import { listFinanceRecurringEntries } from "../../../domains/finance/services/FinanceService/listFinanceRecurringEntries.js";
import { payFinanceEntry } from "../../../domains/finance/services/FinanceService/payFinanceEntry.js";
import { requestFinanceEntryDocumentUpload } from "../../../domains/finance/services/FinanceService/requestFinanceEntryDocumentUpload.js";
import { updateFinanceEntry } from "../../../domains/finance/services/FinanceService/updateFinanceEntry.js";
import { createDrizzleFinanceRepository } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import { createDrizzleDocumentRepository } from "../../../infrastructure/db/documents/drizzleDocumentRepository.js";
import { createMemoryFinanceRepository } from "../../inventory/adapters/memory/financeRepository.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import { createTestDocumentRepository } from "../../../domains/documents/testSupportDocumentRepository.js";

export type FinanceServices = {
  attachDocument: (
    context: ServiceContext,
    input: AttachFinanceEntryDocumentInput,
  ) => Promise<LinkedDocument>;
  createEntry: (
    context: ServiceContext,
    input: CreateFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
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
  getSummary: (context: ServiceContext) => Promise<FinanceSummary>;
  listEntries: (
    context: ServiceContext,
    input: ListFinanceEntriesInput,
  ) => Promise<readonly FinanceEntry[]>;
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
    }
  | {
      drizzleClient: DrizzleFinanceClient;
      objectStorage?: FinanceServicePorts["objectStorage"];
      ports?: never;
    };

export function createFinanceServices(
  options: CreateFinanceServicesOptions = {},
): FinanceServices {
  const ports = resolveFinancePorts(options);

  return {
    attachDocument: (context, input) =>
      attachFinanceEntryDocument(context, input, ports),
    cancelEntry: (context, input) => cancelFinanceEntry(context, input, ports),
    createCommissionRule: (context, input) =>
      createCommissionRule(context, input, ports),
    createEntry: (context, input) => createFinanceEntry(context, input, ports),
    createRecurringEntry: (context, input) =>
      createFinanceRecurringEntry(context, input, ports),
    getSummary: (context) => getFinanceSummary(context, ports),
    async listEntries(context, input) {
      const bundles =
        input.targetId && input.targetType
          ? await listFinanceEntriesByTarget(
              context,
              {
                ...(input.limit !== undefined ? { limit: input.limit } : {}),
                targetId: input.targetId,
                targetType: input.targetType,
              },
              ports,
            )
          : await listFinanceEntries(context, input, ports);
      return bundles.map((bundle) => bundle.entry);
    },
    listCommissionRules: (context, input) =>
      listCommissionRules(context, input, ports),
    listRecurringEntries: (context, input) =>
      listFinanceRecurringEntries(context, input, ports),
    payEntry: (context, input) => payFinanceEntry(context, input, ports),
    requestDocumentUpload: (context, input) =>
      requestFinanceEntryDocumentUpload(context, input, ports),
    updateEntry: (context, input) => updateFinanceEntry(context, input, ports),
  };
}

function resolveFinancePorts(
  options: CreateFinanceServicesOptions,
): FinanceServicePorts {
  if ("ports" in options && options.ports) return options.ports;

  if ("drizzleClient" in options) {
    return {
      documentRepository: createDrizzleDocumentRepository(
        options.drizzleClient,
      ),
      financeRepository: createDrizzleFinanceRepository(options.drizzleClient),
      ...(options.objectStorage
        ? { objectStorage: options.objectStorage }
        : {}),
    };
  }

  return {
    documentRepository: createTestDocumentRepository(),
    financeRepository: createMemoryFinanceRepository(),
    objectStorage: createMemoryObjectStorage(),
  };
}

export const financeServices = createFinanceServices();
