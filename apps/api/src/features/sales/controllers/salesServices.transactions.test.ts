import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createTestFinanceAutoEntryRepository } from "../../../domains/finance/testSupportFinanceAutoEntryRepository.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { createMemoryVehicleInventoryPorts } from "../../inventory/adapters/memory/vehicleInventoryPorts.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import type { VehicleUnit } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  createInMemoryVehiclePorts,
  createListing,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { createSalesServices } from "./salesServices.js";
import type { SalesWorkflowPorts } from "./salesWorkflowTransition.js";

describe("sales transaction composition", () => {
  const cases: readonly [
    string,
    (services: ReturnType<typeof createSalesServices>) => Promise<unknown>,
  ][] = [
    ["createDraft", (services) => services.createDraft(context(), draft())],
    ["delete", (services) => services.delete(context(), "sale_1")],
    [
      "revert",
      (services) =>
        services.revert(context(), {
          reason: "Buyer requested an audited correction",
          saleId: "sale_1",
        }),
    ],
    [
      "transition",
      (services) =>
        services.transition(context(), {
          saleId: "sale_1",
          status: "pending",
        }),
    ],
    [
      "updateDraft",
      (services) => services.updateDraft(context(), "sale_1", draft()),
    ],
  ];

  it.each(cases)("%s runs inside the transaction runner", async (_, call) => {
    const error = new Error("transaction required");
    const runner: TransactionRunner<SalesWorkflowPorts> = {
      runInTransaction: vi.fn(async () => {
        throw error;
      }),
    };
    const services = createSalesServices({
      ports: { salesRepository: createMemorySalesRepository() },
      transactionRunner: runner,
      workflowPorts: createMemoryVehicleInventoryPorts(),
    });

    await expect(call(services)).rejects.toThrow(error);
    expect(runner.runInTransaction).toHaveBeenCalledTimes(1);
  });

  it("deletes stored reservation documents when the sales transaction commit fails", async () => {
    const salesRepository = createMemorySalesRepository();
    const vehiclePorts = createInMemoryVehiclePorts([
      createListing({
        priceCents: 5000000,
        status: "published",
        unitIds: ["unit_1"],
      }),
    ]);
    vehiclePorts.units.set("unit_1", unit());
    const workflowPorts: SalesWorkflowPorts = {
      financeAutoEntryRepository: createTestFinanceAutoEntryRepository(),
      salesRepository,
      vehiclePorts,
    };
    const commitError = new Error("sales transaction commit failed");
    let failCommit = false;
    const runner: TransactionRunner<SalesWorkflowPorts> = {
      async runInTransaction(operation) {
        const result = await operation(workflowPorts);
        if (failCommit) throw commitError;
        return result;
      },
    };
    const services = createSalesServices({
      ports: { salesRepository },
      transactionRunner: runner,
      workflowPorts: vehiclePorts,
    });
    const created = await services.createDraft(context(), {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead_1",
      payments: [
        { amountCents: 100000, method: "pix", principalCents: 100000 },
      ],
      salePriceCents: 5000000,
      sellerUserId: "seller_1",
      unitId: "unit_1",
    });
    failCommit = true;

    await expect(
      services.transition(context(), {
        saleId: created.id,
        status: "pending",
      }),
    ).rejects.toThrow(commitError);

    if (!vehiclePorts.mediaStorage?.deleteObject) {
      throw new Error("Expected compensating storage delete support.");
    }
    expect(vehiclePorts.mediaStorage.putObject).toHaveBeenCalledTimes(1);
    expect(vehiclePorts.mediaStorage.deleteObject).toHaveBeenCalledTimes(1);
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["sale.draft", "sale.reserve"],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function draft() {
  return {
    buyerSnapshot: { name: "Maria" },
    leadId: "lead_1",
    unitId: "unit_1",
  };
}

function unit(): VehicleUnit {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    colorName: null,
    createdAt: now,
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available",
    stockNumber: null,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: now,
    vin: null,
  };
}
