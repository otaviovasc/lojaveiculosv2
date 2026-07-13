import { describe, expect, it } from "vitest";
import { createDrizzleVehicleInventoryRepositories } from "./drizzleVehicleInventoryRepository.js";
import {
  VehicleInventoryDrizzleMappingError,
  type VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";
import { VehicleInventoryDrizzleScopeError } from "./drizzleVehicleInventoryScope.js";
import {
  createFakeDb,
  createRows,
} from "./drizzleVehicleInventoryRepository.testSupport.js";

describe("Drizzle vehicle inventory repositories", () => {
  const listingId = "00000000-0000-4000-8000-000000000001";
  const unitId = "00000000-0000-4000-8000-000000000002";

  it("creates listing and unit records using the product inventory schema", async () => {
    const db = createFakeDb();
    const { listingRepository, unitRepository } =
      createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.create({
      catalog: null,
      description: "Clean sedan",
      manufactureYear: null,
      modelYear: null,
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "published",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Civic EXL",
      trimName: null,
    });
    const unit = await unitRepository.create({
      listingId: listing.id,
      plate: "ABC1D23",
      status: "inactive",
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
      status: "published",
      unitIds: [],
    });
    expect(unit).toMatchObject({
      id: "unit_1",
      plate: "ABC1D23",
      status: "inactive",
    });
  });

  it("preserves in-preparation listing status before units exist", async () => {
    const db = createFakeDb();
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.create({
      catalog: null,
      description: null,
      manufactureYear: null,
      modelYear: null,
      plate: null,
      priceCents: null,
      status: "in_preparation",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Prep vehicle",
      trimName: null,
    });

    expect(db.inserted[0]).toMatchObject({
      status: "in_preparation",
    });
    expect(listing).toMatchObject({
      status: "in_preparation",
      unitIds: [],
    });
  });

  it("creates media records using the product inventory schema", async () => {
    const db = createFakeDb();
    const { mediaRepository } = createDrizzleVehicleInventoryRepositories(db);

    const media = await mediaRepository.create({
      altText: "Front photo",
      displayOrder: 1,
      isPublic: true,
      kind: "photo",
      storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
      storeId: "store_1",
      tenantId: "tenant_1",
      unitId,
      url: "https://cdn.local/front.jpg",
    });

    expect(db.inserted).toEqual([
      expect.objectContaining({
        altText: "Front photo",
        displayOrder: 1,
        kind: "photo",
        storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
        unitId,
      }),
    ]);
    expect(media).toMatchObject({
      altText: "Front photo",
      id: "media_1",
      url: "https://cdn.local/front.jpg",
    });
  });

  it("hydrates listing unit ids and plate from vehicle units", async () => {
    const rows = createRows();
    const db = createFakeDb({
      listings: [rows.listing({ id: listingId, status: "sold_out" })],
      units: [
        rows.unit({
          id: "unit_1",
          listingId,
          plate: "ABC1D23",
          status: "available",
        }),
      ],
    });
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.findById({
      listingId,
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(listing).toMatchObject({
      id: listingId,
      plate: "ABC1D23",
      status: "sold_out",
      unitIds: ["unit_1"],
    });
  });

  it("locks a listing row for serialized stock transitions", async () => {
    const rows = createRows();
    const db = createFakeDb({
      listings: [rows.listing({ id: listingId, status: "published" })],
      units: [rows.unit({ id: unitId, listingId, status: "available" })],
    });
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.lockForStockTransition({
      listingId,
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(db.locks).toEqual(["update"]);
    expect(listing).toMatchObject({
      id: listingId,
      status: "published",
      unitIds: [unitId],
    });
  });

  it("returns null before querying when listing id is not a UUID", async () => {
    const db = createFakeDb();
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    const listing = await listingRepository.findById({
      listingId: "not-a-uuid",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(listing).toBeNull();
  });

  it("rejects null store and tenant scope for DB-backed writes", async () => {
    const db = createFakeDb();
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    await expect(
      listingRepository.create({
        catalog: null,
        description: null,
        manufactureYear: null,
        modelYear: null,
        plate: null,
        priceCents: null,
        status: "draft",
        storeId: null,
        tenantId: "tenant_1",
        title: "Unsynced listing",
        trimName: null,
      }),
    ).rejects.toBeInstanceOf(VehicleInventoryDrizzleScopeError);
  });

  it("fails fast on DB unit statuses outside the current VehicleService port", async () => {
    const rows = createRows();
    const db = createFakeDb({
      listings: [rows.listing()],
      units: [rows.unit({ status: "unknown" as VehicleUnitRow["status"] })],
    });
    const { listingRepository } = createDrizzleVehicleInventoryRepositories(db);

    await expect(
      listingRepository.findById({
        listingId,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).rejects.toBeInstanceOf(VehicleInventoryDrizzleMappingError);
  });
});
