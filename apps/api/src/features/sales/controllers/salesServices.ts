import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { DrizzleSalesClient } from "../../../infrastructure/db/sales/drizzleSalesRepository.js";
import { createDrizzleSalesRepository } from "../../../infrastructure/db/sales/drizzleSalesRepository.js";
import { createSaleDraft } from "../../../domains/sales/services/SalesService/createSaleDraft.js";
import { listSales } from "../../../domains/sales/services/SalesService/listSales.js";
import { transitionSale } from "../../../domains/sales/services/SalesService/transitionSale.js";
import { updateSaleDraft } from "../../../domains/sales/services/SalesService/updateSaleDraft.js";
import type {
  ListSalesInput,
  SaleRecord,
  SaveSaleDraftInput,
} from "../../../domains/sales/ports/salesRepository.js";
import type { SalesServicePorts } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import {
  createClientTransactionRunner,
  createPassthroughTransactionRunner,
  type TransactionRunner,
} from "../../../shared/transaction.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";

export type SalesServices = {
  createDraft: (
    context: ServiceContext,
    input: SaveSaleDraftInput,
  ) => Promise<SaleRecord>;
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
    input: SaveSaleDraftInput,
  ) => Promise<SaleRecord>;
};

export type CreateSalesServicesOptions =
  | {
      drizzleClient: DrizzleSalesClient;
      ports?: never;
      transactionRunner?: TransactionRunner<SalesServicePorts>;
    }
  | {
      drizzleClient?: never;
      ports?: SalesServicePorts;
      transactionRunner?: TransactionRunner<SalesServicePorts>;
    };

export function createSalesServices(
  options: CreateSalesServicesOptions = {},
): SalesServices {
  const ports = resolvePorts(options);
  const transactionRunner = resolveTransactionRunner(options, ports);

  return {
    createDraft: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        createSaleDraft(context, input, txPorts),
      ),
    list: (context, input) => listSales(context, input, ports),
    transition: (context, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        transitionSale(context, input, txPorts),
      ),
    updateDraft: (context, saleId, input) =>
      transactionRunner.runInTransaction((txPorts) =>
        updateSaleDraft(context, saleId, input, txPorts),
      ),
  };
}

function resolvePorts(options: CreateSalesServicesOptions): SalesServicePorts {
  if ("ports" in options && options.ports) return options.ports;
  if ("drizzleClient" in options) {
    return {
      salesRepository: createDrizzleSalesRepository(options.drizzleClient),
    };
  }
  return { salesRepository: createMemorySalesRepository() };
}

function resolveTransactionRunner(
  options: CreateSalesServicesOptions,
  ports: SalesServicePorts,
): TransactionRunner<SalesServicePorts> {
  if (options.transactionRunner) return options.transactionRunner;
  if ("drizzleClient" in options) {
    return createClientTransactionRunner<SalesServicePorts, DrizzleSalesClient>(
      options.drizzleClient,
      (client) => ({
        salesRepository: createDrizzleSalesRepository(client),
      }),
    );
  }
  return createPassthroughTransactionRunner(ports);
}

export const salesServices = createSalesServices();
