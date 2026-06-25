import { describe, expect, it } from "vitest";
import type { VehicleUnit } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  createInMemoryVehiclePorts,
  createListing,
  type TestVehicleInventoryPorts,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createSalesServices, type SalesServices } from "./salesServices.js";

const storeId = "store_1";
const tenantId = "tenant_1";

describe("sales workflow transition", () => {
  it("reserves a sales draft through the canonical vehicle workflow", async () => {
    const { services, vehiclePorts } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 100000,
          method: "pix",
          principalCents: 5000000,
        },
      ],
    });

    const sale = await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });

    expect(sale.id).toBe(draft.id);
    expect(sale.status).toBe("pending");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("reserved");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("reserved");
    expect(vehiclePorts.documents.size).toBe(1);
    expect(vehiclePorts.financeRepository.entries).toHaveLength(1);
    expect(vehiclePorts.financeRepository.entries[0]?.amountCents).toBe(100000);
    expect(vehiclePorts.operationsRepository.statuses).toHaveLength(2);
    expect(vehiclePorts.salesRepository.sales).toHaveLength(0);
    expectFinanceLinkedToSale(vehiclePorts, draft.id);
  });

  it("closes a sales draft through the canonical vehicle workflow", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 5000000,
          method: "pix",
          principalCents: 5000000,
        },
      ],
    });

    const sale = await services.transition(context(["sale.close"]), {
      saleId: draft.id,
      status: "closed",
    });

    expect(sale.id).toBe(draft.id);
    expect(sale.status).toBe("closed");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("sold");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(vehiclePorts.documents.size).toBe(4);
    expect(vehiclePorts.financeRepository.entries).toHaveLength(1);
    expect(vehiclePorts.financeRepository.entries[0]?.amountCents).toBe(
      5000000,
    );
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("paid");
    expect(vehiclePorts.operationsRepository.statuses).toHaveLength(2);
    expect(vehiclePorts.salesRepository.sales).toHaveLength(0);
    expectFinanceLinkedToSale(vehiclePorts, draft.id);
  });
});

function createHarness(status: "available" | "reserved"): {
  services: SalesServices;
  vehiclePorts: TestVehicleInventoryPorts;
} {
  const vehiclePorts = createInMemoryVehiclePorts([
    createListing({
      priceCents: 5000000,
      status,
      storeId,
      tenantId,
      unitIds: ["unit_1"],
    }),
  ]);
  vehiclePorts.units.set("unit_1", createUnit(status));
  const services = createSalesServices({
    ports: { salesRepository: createMemorySalesRepository() },
    workflowPorts: vehiclePorts,
  });
  return { services, vehiclePorts };
}

function completeDraft() {
  return {
    buyerSnapshot: {
      address: "Rua Um, 100",
      document: "000.000.000-00",
      email: "buyer@example.com",
      name: "Maria",
      phone: "(11) 99999-0000",
    },
    documentPolicySnapshot: {},
    leadId: "lead_1",
    listingId: "listing_1",
    salePriceCents: 5000000,
    sellerUserId: "seller_1",
    unitId: "unit_1",
  };
}

function context(permissions: string[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions,
    request: { requestId: "req_1" },
    storeId,
    tenantId,
  });
}

function createUnit(status: "available" | "reserved"): VehicleUnit {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    colorName: null,
    createdAt: now,
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status,
    stockNumber: null,
    storeId,
    tenantId,
    updatedAt: now,
    vin: null,
  };
}

function expectFinanceLinkedToSale(
  vehiclePorts: TestVehicleInventoryPorts,
  saleId: string,
) {
  expect(
    vehiclePorts.financeRepository.links.some(
      (link) => link.targetId === saleId && link.targetType === "sale",
    ),
  ).toBe(true);
}
