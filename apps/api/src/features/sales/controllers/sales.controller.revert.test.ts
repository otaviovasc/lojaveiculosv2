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

describe("sales controller reversion", () => {
  it("routes sale reversion and reports state conflicts", async () => {
    const { app, vehiclePorts } = createTestHarness();
    const created = await readJson<TestSale>(
      await requestJson(app, "/sales/drafts", saleDraft()),
    );
    const closed = await requestJson(app, `/sales/${created.id}/close`, {});
    expect(closed.status).toBe(200);

    const response = await requestJson(app, `/sales/${created.id}/revert`, {
      reason: "Buyer legal name requires correction",
    });
    expect(response.status).toBe(201);
    expect(await readJson<TestSale>(response)).toMatchObject({
      correctionOfSaleId: created.id,
      revision: 2,
      status: "draft",
    });
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("available");

    const conflict = await requestJson(app, `/sales/${created.id}/revert`, {
      reason: "Duplicate retry",
    });
    expect(conflict.status).toBe(409);
    expect(await readJson<{ code: string }>(conflict)).toMatchObject({
      code: "SALE_REVERSION_STATE_ERROR",
    });
  });

  it("requires a nonblank sale reversion reason", async () => {
    const { app } = createTestHarness();
    const response = await requestJson(app, "/sales/sale_1/revert", {
      reason: "   ",
    });

    expect(response.status).toBe(400);
    expect(await readJson<{ code: string }>(response)).toMatchObject({
      code: "SALES_REQUEST_VALIDATION_ERROR",
    });
  });

  it("returns a stable conflict for provider-managed payment compensation", async () => {
    const { app, vehiclePorts } = createTestHarness();
    const created = await readJson<TestSale>(
      await requestJson(app, "/sales/drafts", {
        ...saleDraft(),
        payments: [
          {
            amountCents: 5000000,
            dueAt: "2026-07-14T12:00:00.000Z",
            method: "pix",
            principalCents: 5000000,
            providerPaymentId: "provider-payment-1",
          },
        ],
      }),
    );
    expect(
      (await requestJson(app, `/sales/${created.id}/close`, {})).status,
    ).toBe(200);

    const response = await requestJson(app, `/sales/${created.id}/revert`, {
      reason: "Correction requested",
    });

    expect(response.status).toBe(409);
    expect(
      await readJson<{ code: string; details: Record<string, unknown> }>(
        response,
      ),
    ).toMatchObject({
      code: "SALE_PAYMENT_COMPENSATION_REQUIRED",
      details: { compensationReason: "provider_managed" },
    });
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
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
  vehiclePorts.units.set("unit_1", createUnit());
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
            "sale.close",
            "sale.correct",
            "sale.draft",
            "sale.read",
          ],
          request: { requestId: "test-request" },
          storeId,
          tenantId,
        }),
      services,
    }),
  );
  return { app, vehiclePorts };
}

function saleDraft() {
  return {
    buyerSnapshot: { name: "Maria" },
    leadId: "lead-1",
    payments: [
      {
        amountCents: 5000000,
        dueAt: "2026-07-14T12:00:00.000Z",
        method: "pix",
        principalCents: 5000000,
      },
    ],
    salePriceCents: 5000000,
    selectedDocumentKinds: ["sale_contract", "delivery_term"],
    sellerUserId: "seller-1",
    unitId: "unit_1",
  };
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

function createUnit(): VehicleUnit {
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
  };
}

type TestSale = {
  correctionOfSaleId: string | null;
  id: string;
  revision: number;
  status: string;
};
