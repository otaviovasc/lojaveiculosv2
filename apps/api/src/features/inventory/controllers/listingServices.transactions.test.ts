import { describe, expect, it, vi } from "vitest";
import {
  createInMemoryVehiclePorts,
  createListing,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { createInventoryListingServices } from "./listingServices.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";

describe("inventory listing transaction composition", () => {
  const cases: readonly [
    string,
    (
      services: ReturnType<typeof createInventoryListingServices>,
    ) => Promise<unknown>,
  ][] = [
    [
      "addVehicleCost",
      (services) =>
        services.addVehicleCost(context(), {
          amountCents: 1000,
          kind: "preparation",
          listingId: "listing_1",
          unitId: "unit_1",
        }),
    ],
    [
      "attachListingUnit",
      (services) =>
        services.attachListingUnit(context(), { listingId: "listing_1" }),
    ],
    [
      "attachVehicleDocument",
      (services) =>
        services.attachVehicleDocument(context(), {
          fileName: "doc.pdf",
          kind: "sale_contract",
          listingId: "listing_1",
          storageKey: "storage/key.pdf",
          title: "Doc",
        }),
    ],
    [
      "changeListingStatus",
      (services) =>
        services.changeListingStatus(context(), {
          listingId: "listing_1",
          status: "inactive",
        }),
    ],
    [
      "createChecklist",
      (services) =>
        services.createChecklist(context(), {
          items: [{ label: "Manual", status: "pending" }],
          listingId: "listing_1",
          name: "Entrega",
          unitId: "unit_1",
        }),
    ],
    [
      "reserveListing",
      (services) =>
        services.reserveListing(context(), {
          buyer: buyer(),
          listingId: "listing_1",
          paymentMethod: "pix",
          signalAmountCents: 1000,
          unitId: "unit_1",
        }),
    ],
    [
      "sellListing",
      (services) =>
        services.sellListing(context(), {
          buyer: buyer(),
          listingId: "listing_1",
          paymentMethod: "pix",
          unitId: "unit_1",
        }),
    ],
    [
      "updateListingDetails",
      (services) =>
        services.updateListingDetails(context(), {
          listingId: "listing_1",
          title: "Updated",
        }),
    ],
    [
      "updateChecklist",
      (services) =>
        services.updateChecklist(context(), {
          checklistId: "vehicle_checklist_1",
          items: [{ id: "item_1", label: "Manual", status: "passed" }],
          listingId: "listing_1",
          unitId: "unit_1",
        }),
    ],
    [
      "updateListingPrice",
      (services) =>
        services.updateListingPrice(context(), {
          listingId: "listing_1",
          priceCents: 1000,
        }),
    ],
    [
      "updateListingUnit",
      (services) =>
        services.updateListingUnit(context(), {
          listingId: "listing_1",
          plate: "ABC1D23",
          unitId: "unit_1",
        }),
    ],
  ];

  it.each(cases)("%s runs inside the transaction runner", async (_, call) => {
    const error = new Error("transaction required");
    const runner: TransactionRunner<VehicleInventoryServicePorts> = {
      runInTransaction: vi.fn(async () => {
        throw error;
      }),
    };
    const services = createInventoryListingServices({
      ports: createInMemoryVehiclePorts([
        createListing({ status: "available", unitIds: ["unit_1"] }),
      ]),
      transactionRunner: runner,
    });

    await expect(call(services)).rejects.toThrow(error);
    expect(runner.runInTransaction).toHaveBeenCalledTimes(1);
  });
});

function context() {
  return createServiceContext({
    actor: { id: "00000000-0000-4000-8000-000000000001", kind: "user" },
    permissions: [
      "inventory.cost_create",
      "inventory.create",
      "inventory.checklist_read",
      "inventory.checklist_update",
      "inventory.document_attach",
      "inventory.read",
      "inventory.reserve",
      "inventory.sell",
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_status",
      "inventory.update_unit",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
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
