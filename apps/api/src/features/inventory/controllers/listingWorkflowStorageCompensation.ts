import type { ServiceContext } from "../../../shared/serviceContext.js";
import { runWithObjectStorageTransactionCompensation } from "../../../shared/storage/objectStorageTransactionCompensation.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";

export function runInventoryWorkflowTransaction<TResult>(
  context: ServiceContext,
  transactionRunner: TransactionRunner<VehicleInventoryServicePorts>,
  operation: (ports: VehicleInventoryServicePorts) => Promise<TResult>,
): Promise<TResult> {
  return runWithObjectStorageTransactionCompensation(
    context,
    transactionRunner,
    operation,
    {
      getStorage: (ports) => ports.mediaStorage,
      withStorage: (ports, mediaStorage) => ({ ...ports, mediaStorage }),
    },
  );
}
