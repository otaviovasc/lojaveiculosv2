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

describe("sales controller", () => {
  it("creates and lists sale drafts", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      leadId: "lead-1",
    });

    expect(createResponse.status).toBe(201);
    const created = await readJson<TestSale>(createResponse);
    expect(created.status).toBe("draft");
    expect(created.leadId).toBe("lead-1");

    const listResponse = await app.request("/sales");
    expect(listResponse.status).toBe(200);
    const payload = await readJson<TestSaleList>(listResponse);
    expect(payload.sales).toHaveLength(1);
    const listed = payload.sales[0];
    if (!listed) throw new Error("Expected sale in list response.");
    expect(listed.id).toBe(created.id);
  });

  it("blocks reserve when required fields are missing", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      salePriceCents: 5000000,
      unitId: "unit-1",
    });
    const created = await readJson<TestSale>(createResponse);

    const reserveResponse = await requestJson(
      app,
      `/sales/${created.id}/reserve`,
      {},
    );
    expect(reserveResponse.status).toBe(409);
    const payload = await readJson<TestReadinessError>(reserveResponse);
    expect(payload.missingFields).toContain("listing");
    expect(payload.missingFields).toContain("buyer");
    expect(payload.missingFields).toContain("lead");
    expect(payload.missingFields).toContain("seller");
    expect(payload.missingFields).toContain("payment_principal_coverage");
  });

  it("reserves complete sale drafts", async () => {
    const app = createTestApp();
    const createResponse = await requestJson(app, "/sales/drafts", {
      buyerSnapshot: { name: "Maria" },
      documentPolicySnapshot: {
        requiredDocumentKinds: ["sale_contract"],
      },
      leadId: "lead-1",
      listingId: "listing_1",
      payments: [
        {
          amountCents: 5000000,
          method: "pix",
          principalCents: 5000000,
        },
      ],
      salePriceCents: 5000000,
      selectedDocumentKinds: ["sale_contract"],
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
    expect(reserved.status).toBe("pending");
  });
});

function createTestApp() {
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
      contextFactory: async () =>
        createServiceContext({
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
        }),
      services,
    }),
  );
  return app;
}

function requestJson(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type TestSale = {
  id: string;
  leadId: string | null;
  status: string;
};

type TestSaleList = {
  sales: TestSale[];
};

type TestReadinessError = {
  missingFields: string[];
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
