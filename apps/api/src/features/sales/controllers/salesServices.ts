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
  | { drizzleClient: DrizzleSalesClient; ports?: never }
  | { drizzleClient?: never; ports?: SalesServicePorts };

export function createSalesServices(
  options: CreateSalesServicesOptions = {},
): SalesServices {
  const ports = resolvePorts(options);

  return {
    createDraft: (context, input) => createSaleDraft(context, input, ports),
    list: (context, input) => listSales(context, input, ports),
    transition: (context, input) => transitionSale(context, input, ports),
    updateDraft: (context, saleId, input) =>
      updateSaleDraft(context, saleId, input, ports),
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

export const salesServices = createSalesServices();
