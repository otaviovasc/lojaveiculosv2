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
import type { CancelFinanceRecurringEntryInput } from "../../../domains/finance/services/FinanceService/cancelFinanceRecurringEntry.js";
import type { CreateFinanceRecurringEntryInput } from "../../../domains/finance/services/FinanceService/createFinanceRecurringEntry.js";
import type {
  FinanceEntryDocumentDownload,
  GetFinanceEntryDocumentDownloadInput,
} from "../../../domains/finance/services/FinanceService/getFinanceEntryDocumentDownload.js";
import type { ListFinanceRecurringEntriesInput } from "../../../domains/finance/services/FinanceService/listFinanceRecurringEntries.js";
import type {
  MaterializeFinanceRecurringEntriesInput,
  MaterializeFinanceRecurringEntriesResult,
} from "../../../domains/finance/services/FinanceService/materializeFinanceRecurringEntries.js";
import type { UpdateFinanceRecurringEntryInput } from "../../../domains/finance/services/FinanceService/updateFinanceRecurringEntry.js";
import type { CreateCommissionRuleInput } from "../../../domains/finance/services/FinanceService/createCommissionRule.js";
import type { ListCommissionRulesInput } from "../../../domains/finance/services/FinanceService/listCommissionRules.js";
import type { CreateFinanceAutoEntryRuleInput } from "../../../domains/finance/services/FinanceService/createFinanceAutoEntryRule.js";
import type { ListFinanceAutoEntryRulesInput } from "../../../domains/finance/services/FinanceService/listFinanceAutoEntryRules.js";
import type { UpdateFinanceAutoEntryRuleInput } from "../../../domains/finance/services/FinanceService/updateFinanceAutoEntryRule.js";
import type {
  MaterializeFinanceAutoEntriesInput,
  MaterializedFinanceAutoEntry,
} from "../../../domains/finance/services/FinanceService/materializeFinanceAutoEntries.js";
import type { ObjectUpload } from "../../../shared/storage/objectStorage.js";
import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import type {
  CommissionRule,
  FinanceEntry,
  FinanceEntryBundle,
  FinanceEntryLink,
  FinanceRecurringEntry,
} from "../../../domains/finance/ports/financeRepository.js";
import type { FinanceAutoEntryRule } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import type { FinanceSummary } from "../../../domains/finance/services/FinanceService/getFinanceSummary.js";
import type {
  CommissionWorkspace,
  GetCommissionWorkspaceInput,
} from "../../../domains/finance/services/FinanceService/getCommissionWorkspace.js";
import type {
  CommissionSettlementResult,
  SettleCommissionEntriesInput,
} from "../../../domains/finance/services/FinanceService/settleCommissionEntries.js";
import type { TransactionRunner } from "../../../shared/transaction.js";

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
  cancelEntry: (
    context: ServiceContext,
    input: CancelFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  cancelRecurringEntry: (
    context: ServiceContext,
    input: CancelFinanceRecurringEntryInput,
  ) => Promise<FinanceRecurringEntry>;
  createAutoEntryRule: (
    context: ServiceContext,
    input: CreateFinanceAutoEntryRuleInput,
  ) => Promise<FinanceAutoEntryRule>;
  createCommissionRule: (
    context: ServiceContext,
    input: CreateCommissionRuleInput,
  ) => Promise<CommissionRule>;
  createEntry: (
    context: ServiceContext,
    input: CreateFinanceEntryInput,
  ) => Promise<CreateFinanceEntryResult>;
  createRecurringEntry: (
    context: ServiceContext,
    input: CreateFinanceRecurringEntryInput,
  ) => Promise<FinanceRecurringEntry>;
  deactivateAutoEntryRule: (
    context: ServiceContext,
    input: { ruleId: string },
  ) => Promise<FinanceAutoEntryRule>;
  deleteEntry: (
    context: ServiceContext,
    input: CancelFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  getEntry: (
    context: ServiceContext,
    input: GetFinanceEntryDetailInput,
  ) => Promise<FinanceEntryDetail>;
  getEntryDocumentDownload: (
    context: ServiceContext,
    input: GetFinanceEntryDocumentDownloadInput,
  ) => Promise<FinanceEntryDocumentDownload>;
  getCommissionWorkspace: (
    context: ServiceContext,
    input: GetCommissionWorkspaceInput,
  ) => Promise<CommissionWorkspace>;
  getSummary: (context: ServiceContext) => Promise<FinanceSummary>;
  listAutoEntryRules: (
    context: ServiceContext,
    input: ListFinanceAutoEntryRulesInput,
  ) => Promise<readonly FinanceAutoEntryRule[]>;
  listCommissionRules: (
    context: ServiceContext,
    input: ListCommissionRulesInput,
  ) => Promise<readonly CommissionRule[]>;
  listEntries: (
    context: ServiceContext,
    input: ListFinanceEntriesInput,
  ) => Promise<FinanceEntryListResultDto>;
  listRecurringEntries: (
    context: ServiceContext,
    input: ListFinanceRecurringEntriesInput,
  ) => Promise<readonly FinanceRecurringEntry[]>;
  materializeAutoEntries: (
    context: ServiceContext,
    input: MaterializeFinanceAutoEntriesInput,
  ) => Promise<readonly MaterializedFinanceAutoEntry[]>;
  materializeRecurringEntries: (
    context: ServiceContext,
    input: MaterializeFinanceRecurringEntriesInput,
  ) => Promise<MaterializeFinanceRecurringEntriesResult>;
  payEntry: (
    context: ServiceContext,
    input: PayFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  requestDocumentUpload: (
    context: ServiceContext,
    input: RequestFinanceEntryDocumentUploadInput,
  ) => Promise<ObjectUpload>;
  settleCommissionEntries: (
    context: ServiceContext,
    input: SettleCommissionEntriesInput,
  ) => Promise<CommissionSettlementResult>;
  updateAutoEntryRule: (
    context: ServiceContext,
    input: UpdateFinanceAutoEntryRuleInput,
  ) => Promise<FinanceAutoEntryRule>;
  updateEntry: (
    context: ServiceContext,
    input: UpdateFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
  updateRecurringEntry: (
    context: ServiceContext,
    input: UpdateFinanceRecurringEntryInput,
  ) => Promise<FinanceRecurringEntry>;
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
