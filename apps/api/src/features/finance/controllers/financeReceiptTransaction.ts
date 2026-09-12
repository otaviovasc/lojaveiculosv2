import { DocumentLinkUniquenessConflictError } from "../../../domains/documents/ports/documentRepository.js";
import {
  generateFinanceEntryReceipt,
  type GenerateFinanceEntryReceiptResult,
} from "../../../domains/finance/services/FinanceService/generateFinanceEntryReceipt.js";
import type { FinanceServicePorts } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { runWithObjectStorageTransactionCompensation } from "../../../shared/storage/objectStorageTransactionCompensation.js";
import type { TransactionRunner } from "../../../shared/transaction.js";

export async function generateFinanceEntryReceiptTransaction(
  context: ServiceContext,
  input: { entryId: string },
  transactionRunner: TransactionRunner<FinanceServicePorts>,
): Promise<GenerateFinanceEntryReceiptResult> {
  try {
    return await runReceiptAttempt(context, input, transactionRunner);
  } catch (error) {
    if (!(error instanceof DocumentLinkUniquenessConflictError)) throw error;
    return runReceiptAttempt(context, input, transactionRunner);
  }
}

function runReceiptAttempt(
  context: ServiceContext,
  input: { entryId: string },
  transactionRunner: TransactionRunner<FinanceServicePorts>,
) {
  return runWithObjectStorageTransactionCompensation(
    context,
    transactionRunner,
    (ports) => generateFinanceEntryReceipt(context, input, ports),
    {
      getStorage: (ports) => ports.objectStorage,
      withStorage: (ports, objectStorage) => ({
        ...ports,
        objectStorage,
      }),
    },
  );
}
