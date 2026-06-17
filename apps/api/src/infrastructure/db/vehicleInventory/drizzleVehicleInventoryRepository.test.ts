import { describe, expect, it } from "vitest";
import { createDrizzleVehicleInventoryRepositories } from "./drizzleVehicleInventoryRepository.js";
import {
  VehicleInventoryDrizzleMappingError,
  VehicleInventoryDrizzleScopeError,
} from "./drizzleVehicleInventoryMappers.js";
import {
  createFakeDb,
  createRows,
} from "./drizzleVehicleInventoryRepository.testSupport.js";

describe("Drizzle vehicle inventory repositories", () => {
  it("creates listing and unit records using the product inventory schema", async () => {
    const db = createFakeDb();
    const { listingRepository, unitRepository } =
      createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.create({
      description: "Clean sedan",
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "available",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Civic EXL",
    });
    const unit = await unitRepository.create({
      listingId: listing.id,
      plate: "ABC1D23",
      status: "retired",
      stockNumber: "stock_1",
      storeId: "store_1",
      tenantId: "tenant_1",
      vin: "vin_1",
    });

    expect(db.inserted).toEqual([
      expect.objectContaining({
        askingPriceCents: 12000000,
        status: "published",
        title: "Civic EXL",
      }),
      expect.objectContaining({
        listingId: "listing_1",
        plate: "ABC1D23",
        status: "inactive",
      }),
    ]);
    expect(listing).toMatchObject({
      id: "listing_1",
      plate: null,
      status: "available",
      unitIds: [],
    });
    expect(unit).toMatchObject({
      id: "unit_1",
      plate: "ABC1D23",
      status: "retired",
    });
  });

  it("hydrates listing unit ids and plate from vehicle units", async () => {
    const rows = createRows();
    const db = createFakeDb({
      listings: [rows.listing({ id: "listing_1", status: "sold_out" })],
      units: [
        rows.unit({
          id: "unit_1",
          listingId: "listing_1",
          plate: "ABC1D23",
          status: "available",
        }),
      ],
    });
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.findById({
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(listing).toMatchObject({
      id: "listing_1",
      plate: "ABC1D23",
      status: "sold",
      unitIds: ["unit_1"],
    });
  });

  it("rejects null store and tenant scope for DB-backed writes", async () => {
    const db = createFakeDb();
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    await expect(
      listingRepository.create({
        description: null,
        plate: null,
        priceCents: null,
        status: "draft",
        storeId: null,
        tenantId: "tenant_1",
        title: "Unsynced listing",
      }),
    ).rejects.toBeInstanceOf(VehicleInventoryDrizzleScopeError);
  });

  it("fails fast on DB statuses outside the current VehicleService port", async () => {
    const rows = createRows();
    const db = createFakeDb({
      listings: [rows.listing({ status: "archived" })],
      units: [],
    });
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    await expect(
      listingRepository.findById({
        listingId: "listing_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).rejects.toBeInstanceOf(VehicleInventoryDrizzleMappingError);
  });
});
