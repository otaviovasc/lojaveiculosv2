import { describe, expect, it } from "vitest";
import { createDrizzleVehicleInventoryRepositories } from "./drizzleVehicleInventoryRepository.js";
import { createFakeDb } from "./drizzleVehicleInventoryRepository.testSupport.js";

describe("Drizzle vehicle unit optional identifiers", () => {
  it("stores blank optional identifiers as null", async () => {
    const db = createFakeDb();
    const { unitRepository } = createDrizzleVehicleInventoryRepositories(db);

    await unitRepository.create({
      listingId: "listing_1",
      plate: "   ",
      status: "inactive",
      stockNumber: "",
      storeId: "store_1",
      tenantId: "tenant_1",
      vin: "\t",
    });

    expect(db.inserted).toEqual([
      expect.objectContaining({
        plate: null,
        stockNumber: null,
        vin: null,
      }),
    ]);
  });
});
