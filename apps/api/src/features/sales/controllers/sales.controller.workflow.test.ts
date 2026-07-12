import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { VehicleUnit } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  createInMemoryVehiclePorts,
  createListing,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createSalesFeature } from "./sales.controller.js";
import { createSalesServices } from "./salesServices.js";

const storeId = "store-1";
const tenantId = "tenant-1";
const selectedDocumentKinds = ["sale_contract", "delivery_term"];
const allDocumentKinds = [
  "sale_contract",
  "sale_receipt",
  "delivery_term",
  "power_of_attorney",
];

describe("sales controller workflow", () => {
  it("persists pending sale payments before close workflow documents are emitted", async () => {
    const { app, vehiclePorts } = createTestHarness();
    const createResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      documentPolicySnapshot: {
        requiredDocumentKinds: selectedDocumentKinds,
      },
      leadId: "lead-1",
      payments: [payment(100000, "pix")],
      salePriceCents: 5000000,
      selectedDocumentKinds: allDocumentKinds,
      sellerUserId: "seller-1",
      unitId: "unit_1",
    });
    const created = await readJson<TestSale>(createResponse);

    const reserveResponse = await requestJson(
      app,
      `/sales/${created.id}/reserve`,
      {},
    );
    expect(reserveResponse.status).toBe(200);
    const reserved = await readJson<TestSale>(reserveResponse);
    const reservationPaymentId = reserved.payments[0]?.id;
    expect([...vehiclePorts.documents.values()].map((doc) => doc.kind)).toEqual(
      ["reservation_receipt"],
    );

    const updateResponse = await requestJson(
      app,
      `/sales/${created.id}`,
      {
        payments: [payment(200000, "cash"), payment(4900000, "bank_transfer")],
        selectedDocumentKinds,
      },
      "PATCH",
    );
    expect(updateResponse.status).toBe(200);
    const updated = await readJson<TestSale>(updateResponse);
    expect(updated.payments).toHaveLength(2);
    expect(updated.payments[0]?.id).toBe(reservationPaymentId);
    expect(updated.payments[0]?.amountCents).toBe(100000);

    const closeResponse = await requestJson(
      app,
      `/sales/${created.id}/close`,
      {},
    );
    expect(closeResponse.status).toBe(200);
    const closed = await readJson<TestSale>(closeResponse);
    expect(closed.status).toBe("closed");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect([...vehiclePorts.documents.values()].map((doc) => doc.kind)).toEqual(
      ["reservation_receipt", "sale_contract", "delivery_term"],
    );
  });

  it("rejects sale document kinds without a workflow renderer", async () => {
    const { app } = createTestHarness();

    const response = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      selectedDocumentKinds: ["warranty"],
    });

    expect(response.status).toBe(400);
  });
});

function createTestHarness() {
  const app = new Hono();
  const vehiclePorts = createInMemoryVehiclePorts([
    createListing({
      priceCents: 5000000,
      status: "published",
      storeId,
      tenantId,
      unitIds: ["unit_1"],
    }),
  ]);
  vehiclePorts.units.set(
    "unit_1",
    createUnit({ listingId: "listing_1", status: "available" }),
  );
  const services = createSalesServices({
    ports: { salesRepository: createMemorySalesRepository() },
    workflowPorts: vehiclePorts,
  });
  app.route(
    "/sales",
    createSalesFeature({
      contextFactory: async () => createTestContext(),
      services,
    }),
  );
  return { app, vehiclePorts };
}

function createTestContext() {
  return createServiceContext({
    actor: { id: "user-1", kind: "user" },
    permissions: [
      "sale.cancel",
      "sale.close",
      "sale.draft",
      "sale.read",
      "sale.reserve",
    ],
    request: { requestId: "test-request" },
    storeId,
    tenantId,
  });
}

function requestJson(app: Hono, path: string, body: unknown, method = "POST") {
  return app.request(path, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method,
  });
}

function payment(amountCents: number, method: string) {
  return { amountCents, method, principalCents: amountCents };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type TestSale = {
  id: string;
  payments: { amountCents: number; id: string; principalCents: number }[];
  status: string;
};

function createUnit(input: Partial<VehicleUnit> = {}): VehicleUnit {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    colorName: null,
    createdAt: now,
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available",
    stockNumber: null,
    storeId,
    tenantId,
    updatedAt: now,
    vin: null,
    ...input,
  };
}
