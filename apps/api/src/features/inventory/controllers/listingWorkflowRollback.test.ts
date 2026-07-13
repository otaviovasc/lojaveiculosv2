import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
  type TestVehicleInventoryPorts,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { createInventoryListingServices } from "./listingServices.js";

describe("inventory reserve/sell rollback", () => {
  it("rolls back reserve writes when status history fails", async () => {
    const ports = await createWorkflowPorts();
    const error = new Error("status history failed");
    const services = createInventoryListingServices({
      ports,
      transactionRunner: statusHistoryFailingRunner(ports, error),
    });

    await expect(
      services.reserveUnit(workflowContext("inventory.reserve"), {
        buyer: buyer(),
        paymentMethod: "pix",
        signalAmountCents: 100000,
        unitId: "unit_1",
      }),
    ).rejects.toThrow(error);

    expectNoWorkflowWrites(ports, "published");
  });

  it("rolls back sell writes when status history fails", async () => {
    const ports = await createWorkflowPorts();
    const error = new Error("status history failed");
    const services = createInventoryListingServices({
      ports,
      transactionRunner: statusHistoryFailingRunner(ports, error),
    });

    await expect(
      services.sellUnit(workflowContext("inventory.sell"), {
        buyer: buyer(),
        paymentMethod: "pix",
        unitId: "unit_1",
      }),
    ).rejects.toThrow(error);

    expectNoWorkflowWrites(ports, "published");
  });

  it.each([
    {
      name: "reserve",
      objectCount: 1,
      run: (services: ReturnType<typeof createInventoryListingServices>) =>
        services.reserveUnit(workflowContext("inventory.reserve"), {
          buyer: buyer(),
          paymentMethod: "pix",
          signalAmountCents: 100000,
          unitId: "unit_1",
        }),
    },
    {
      name: "sell",
      objectCount: 4,
      run: (services: ReturnType<typeof createInventoryListingServices>) =>
        services.sellUnit(workflowContext("inventory.sell"), {
          buyer: buyer(),
          paymentMethod: "pix",
          unitId: "unit_1",
        }),
    },
  ])(
    "deletes $objectCount stored document objects when $name commit fails",
    async ({ objectCount, run }) => {
      const ports = await createWorkflowPorts();
      const error = new Error("transaction commit failed");
      const services = createInventoryListingServices({
        ports,
        transactionRunner: commitFailingRunner(ports, error),
      });

      await expect(run(services)).rejects.toThrow(error);

      if (!ports.mediaStorage?.deleteObject) {
        throw new Error("Expected compensating storage delete support.");
      }
      expect(ports.mediaStorage.putObject).toHaveBeenCalledTimes(objectCount);
      expect(ports.mediaStorage.deleteObject).toHaveBeenCalledTimes(
        objectCount,
      );
      for (const [input] of vi.mocked(ports.mediaStorage.deleteObject).mock
        .calls) {
        expect(input.storageKey).toContain("/documents/");
      }
      expectNoWorkflowWrites(ports, "published");
    },
  );
});

async function createWorkflowPorts() {
  const ports = createInMemoryVehiclePorts([
    createListing({ status: "published" }),
  ]);
  await attachVehicleUnit(
    workflowContext("inventory.create"),
    { listingId: "listing_1" },
    ports,
  );
  return ports;
}

function statusHistoryFailingRunner(
  rootPorts: TestVehicleInventoryPorts,
  error: Error,
): TransactionRunner<VehicleInventoryServicePorts> {
  return {
    async runInTransaction(operation) {
      const stagedPorts = clonePorts(rootPorts);
      stagedPorts.operationsRepository.createStatusHistory = vi.fn(async () => {
        throw error;
      });
      const result = await operation(stagedPorts);
      commitPorts(rootPorts, stagedPorts);
      return result;
    },
  };
}

function commitFailingRunner(
  rootPorts: TestVehicleInventoryPorts,
  error: Error,
): TransactionRunner<VehicleInventoryServicePorts> {
  return {
    async runInTransaction(operation) {
      const stagedPorts = clonePorts(rootPorts);
      if (!rootPorts.mediaStorage) {
        throw new Error("Expected workflow media storage.");
      }
      stagedPorts.mediaStorage = rootPorts.mediaStorage;
      await operation(stagedPorts);
      throw error;
    },
  };
}

function clonePorts(source: TestVehicleInventoryPorts) {
  const clone = createInMemoryVehiclePorts();
  copyMap(clone.listings, source.listings);
  copyMap(clone.documents, source.documents);
  copyMap(clone.media, source.media);
  copyMap(clone.units, source.units);
  copyArray(clone.financeRepository.entries, source.financeRepository.entries);
  copyArray(clone.financeRepository.links, source.financeRepository.links);
  copyArray(clone.salesRepository.sales, source.salesRepository.sales);
  copyArray(clone.salesRepository.payments, source.salesRepository.payments);
  copyArray(
    clone.operationsRepository.statuses,
    source.operationsRepository.statuses,
  );
  return clone;
}

function commitPorts(
  target: TestVehicleInventoryPorts,
  source: TestVehicleInventoryPorts,
) {
  copyMap(target.listings, source.listings);
  copyMap(target.documents, source.documents);
  copyMap(target.media, source.media);
  copyMap(target.units, source.units);
  copyArray(target.financeRepository.entries, source.financeRepository.entries);
  copyArray(target.financeRepository.links, source.financeRepository.links);
  copyArray(target.salesRepository.sales, source.salesRepository.sales);
  copyArray(target.salesRepository.payments, source.salesRepository.payments);
  copyArray(
    target.operationsRepository.statuses,
    source.operationsRepository.statuses,
  );
}

function copyMap<T>(target: Map<string, T>, source: Map<string, T>) {
  target.clear();
  for (const [key, value] of source) target.set(key, structuredClone(value));
}

function copyArray<T>(target: T[], source: readonly T[]) {
  target.splice(
    0,
    target.length,
    ...source.map((item) => structuredClone(item)),
  );
}

function expectNoWorkflowWrites(
  ports: TestVehicleInventoryPorts,
  listingStatus: "published",
) {
  expect(ports.listings.get("listing_1")?.status).toBe(listingStatus);
  expect(ports.units.get("unit_1")?.status).toBe("available");
  expect(ports.documents.size).toBe(0);
  expect(ports.financeRepository.entries).toHaveLength(0);
  expect(ports.financeRepository.links).toHaveLength(0);
  expect(ports.salesRepository.sales).toHaveLength(0);
  expect(ports.salesRepository.payments).toHaveLength(0);
  expect(ports.operationsRepository.statuses).toHaveLength(0);
}

function workflowContext(permission: string) {
  return createContext(["inventory.create", permission]);
}

function buyer() {
  return {
    address: "Rua Um, 100",
    document: "000.000.000-00",
    email: "buyer@example.com",
    name: "Buyer Example",
    phone: "(11) 99999-0000",
  };
}
