import type { ServiceContext } from "../../../shared/serviceContext.js";
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
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createMemoryVehicleInventoryPorts } from "../../inventory/adapters/memory/vehicleInventoryPorts.js";
import {
  transitionSaleWithWorkflow,
  type SalesWorkflowPorts,
} from "./salesWorkflowTransition.js";

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
      drizzleClient: DrizzleSalesClient;
      ports?: never;
      transactionRunner?: TransactionRunner<SalesWorkflowPorts>;
      workflowAdapter?: SalesWorkflowAdapter;
      workflowPorts?: never;
    }
  | {
      drizzleClient?: never;
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
    transition: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        transitionSaleWithWorkflow(context, input, txPorts),
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
    return { ...salesPorts, vehiclePorts: options.workflowPorts };
  }
  if ("drizzleClient" in options) {
    return createDrizzleWorkflowPorts(options, options.drizzleClient);
  }
  return {
    ...salesPorts,
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
    salesRepository: createDrizzleSalesRepository(client),
    vehiclePorts: workflowAdapter(client),
  };
}

const createDefaultWorkflowAdapter: SalesWorkflowAdapter = (client) =>
  createDrizzleVehicleInventoryRepositories(
    client as unknown as DrizzleVehicleInventoryClient,
  );

export const salesServices = createSalesServices();
