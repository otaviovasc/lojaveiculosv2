import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { FinanceAutoEntryRepository } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import { createTestFinanceAutoEntryRepository } from "../../../domains/finance/testSupportFinanceAutoEntryRepository.js";
import { createDrizzleFinanceAutoEntryRepository } from "../../../infrastructure/db/finance/drizzleFinanceAutoEntryRepository.js";
import {
  createDrizzleCrmRepository,
  type DrizzleCrmClient,
} from "../../../infrastructure/db/crm/drizzleCrmRepository.js";
import type { DrizzleFinanceClient } from "../../../infrastructure/db/finance/drizzleFinanceRepository.js";
import type { DrizzleSalesClient } from "../../../infrastructure/db/sales/drizzleSalesRepository.js";
import { createDrizzleSalesRepository } from "../../../infrastructure/db/sales/drizzleSalesRepository.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import { createSaleDraft } from "../../../domains/sales/services/SalesService/createSaleDraft.js";
import { deleteSaleDraft } from "../../../domains/sales/services/SalesService/deleteSaleDraft.js";
import { listSales } from "../../../domains/sales/services/SalesService/listSales.js";
import { updateSaleDraft } from "../../../domains/sales/services/SalesService/updateSaleDraft.js";
import { revertClosedSale } from "../../../domains/sales/services/SalesService/revertClosedSale.js";
import type {
  ListSalesInput,
  SaleRecord,
  SaveSaleDraftInput,
  UpdateSaleDraftInput,
} from "../../../domains/sales/ports/salesRepository.js";
import type { SalesServicePorts } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  createClientTransactionRunner,
  createPassthroughTransactionRunner,
  type TransactionRunner,
} from "../../../shared/transaction.js";
import { runWithObjectStorageTransactionCompensation } from "../../../shared/storage/objectStorageTransactionCompensation.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createMemoryVehicleInventoryPorts } from "../../inventory/adapters/memory/vehicleInventoryPorts.js";
import {
  transitionSaleWithWorkflow,
  type SalesWorkflowPorts,
} from "./salesWorkflowTransition.js";
import { compensateClosedSale } from "../adapters/salesReversionCompensation.js";

export type SalesServices = {
  createDraft: (
    context: ServiceContext,
    input: SaveSaleDraftInput,
  ) => Promise<SaleRecord>;
  delete: (context: ServiceContext, saleId: string) => Promise<SaleRecord>;
  list: (
    context: ServiceContext,
    input: Omit<ListSalesInput, "storeId" | "tenantId">,
  ) => Promise<readonly SaleRecord[]>;
  revert: (
    context: ServiceContext,
    input: { reason: string; saleId: string },
  ) => Promise<SaleRecord>;
  transition: (
    context: ServiceContext,
    input: {
      overrideReason?: string | null;
      overrideRequiredFields?: boolean;
      saleId: string;
      status: "pending" | "closed" | "cancelled";
    },
  ) => Promise<SaleRecord>;
  updateDraft: (
    context: ServiceContext,
    saleId: string,
    input: UpdateSaleDraftInput,
  ) => Promise<SaleRecord>;
};

export type CreateSalesServicesOptions =
  | {
      crmRepository?: never;
      drizzleClient: DrizzleSalesClient;
      financeAutoEntryRepository?: never;
      ports?: never;
      transactionRunner?: TransactionRunner<SalesWorkflowPorts>;
      workflowAdapter?: SalesWorkflowAdapter;
      workflowPorts?: never;
    }
  | {
      drizzleClient?: never;
      crmRepository?: Pick<CrmRepository, "listActivities">;
      financeAutoEntryRepository?: FinanceAutoEntryRepository;
      ports?: SalesServicePorts;
      transactionRunner?: TransactionRunner<SalesWorkflowPorts>;
      workflowAdapter?: never;
      workflowPorts?: VehicleInventoryServicePorts;
    };

export type SalesWorkflowAdapter = (
  client: DrizzleSalesClient,
) => VehicleInventoryServicePorts;

export function createSalesServices(
  options: CreateSalesServicesOptions = {},
): SalesServices {
  const ports = resolveSalesPorts(options);
  const workflowPorts = resolveWorkflowPorts(options, ports);
  const transactionRunner = resolveTransactionRunner(options, workflowPorts);

  return {
    createDraft: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        createSaleDraft(context, input, txPorts),
      ),
    delete: (context, saleId) =>
      transactionRunner.runInTransaction((txPorts) =>
        deleteSaleDraft(context, saleId, txPorts),
      ),
    list: (context, input) => listSales(context, input, ports),
    revert: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        revertClosedSale(context, input, txPorts, {
          compensate: (sale, reason) =>
            compensateClosedSale(context, sale, reason, txPorts.vehiclePorts),
        }),
      ),
    transition: (context, input) =>
      runWithObjectStorageTransactionCompensation(
        context,
        transactionRunner,
        (txPorts) => transitionSaleWithWorkflow(context, input, txPorts),
        salesWorkflowStorageAdapter,
      ),
    updateDraft: (context, saleId, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        updateSaleDraft(context, saleId, input, txPorts),
      ),
  };
}

function resolveSalesPorts(
  options: CreateSalesServicesOptions,
): SalesServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options) {
    return {
      salesRepository: createDrizzleSalesRepository(options.drizzleClient),
    };
  }
  return { salesRepository: createMemorySalesRepository() };
}

function resolveWorkflowPorts(
  options: CreateSalesServicesOptions,
  salesPorts: SalesServicePorts,
): SalesWorkflowPorts {
  if ("workflowPorts" in options && options.workflowPorts) {
    return {
      ...salesPorts,
      ...(options.crmRepository
        ? { crmRepository: options.crmRepository }
        : {}),
      financeAutoEntryRepository:
        options.financeAutoEntryRepository ??
        createTestFinanceAutoEntryRepository(),
      vehiclePorts: options.workflowPorts,
    };
  }
  if ("drizzleClient" in options) {
    return createDrizzleWorkflowPorts(options, options.drizzleClient);
  }
  return {
    ...salesPorts,
    financeAutoEntryRepository: createTestFinanceAutoEntryRepository(),
    vehiclePorts: createMemoryVehicleInventoryPorts(),
  };
}

function resolveTransactionRunner(
  options: CreateSalesServicesOptions,
  ports: SalesWorkflowPorts,
): TransactionRunner<SalesWorkflowPorts> {
  if (options.transactionRunner) return options.transactionRunner;
  if ("drizzleClient" in options) {
    return createClientTransactionRunner<
      SalesWorkflowPorts,
      DrizzleSalesClient
    >(options.drizzleClient, (client) =>
      createDrizzleWorkflowPorts(options, client),
    );
  }
  return createPassthroughTransactionRunner(ports);
}

function createDrizzleWorkflowPorts(
  options: CreateSalesServicesOptions,
  client: DrizzleSalesClient,
): SalesWorkflowPorts {
  const workflowAdapter =
    "drizzleClient" in options
      ? (options.workflowAdapter ?? createDefaultWorkflowAdapter)
      : createDefaultWorkflowAdapter;

  return {
    crmRepository: createDrizzleCrmRepository(
      client as unknown as DrizzleCrmClient,
    ),
    financeAutoEntryRepository: createDrizzleFinanceAutoEntryRepository(
      client as unknown as DrizzleFinanceClient,
    ),
    salesRepository: createDrizzleSalesRepository(client),
    vehiclePorts: workflowAdapter(client),
  };
}

const createDefaultWorkflowAdapter: SalesWorkflowAdapter = (client) =>
  createDrizzleVehicleInventoryRepositories(
    client as unknown as DrizzleVehicleInventoryClient,
  );

const salesWorkflowStorageAdapter = {
  getStorage: (ports: SalesWorkflowPorts) => ports.vehiclePorts.mediaStorage,
  withStorage: (
    ports: SalesWorkflowPorts,
    mediaStorage: NonNullable<
      SalesWorkflowPorts["vehiclePorts"]["mediaStorage"]
    >,
  ): SalesWorkflowPorts => ({
    ...ports,
    vehiclePorts: { ...ports.vehiclePorts, mediaStorage },
  }),
};

export const salesServices = createSalesServices();
