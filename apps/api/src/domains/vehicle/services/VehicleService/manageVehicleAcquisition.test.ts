import { describe, expect, it } from "vitest";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";
import { createVehicleSupplier } from "./manageVehicleSuppliers.js";
import { upsertVehicleUnitAcquisition } from "./manageVehicleUnitAcquisition.js";

const context = () =>
  createContext(["inventory.update_unit", "inventory.read"]);

describe("manage vehicle acquisition", () => {
  it("upserts a scoped unit acquisition with a scoped supplier", async () => {
    const listing = createListing({ unitIds: ["unit_1"] });
    const ports = createInMemoryVehiclePorts([listing]);
    ports.units.set("unit_1", {
      colorName: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "unit_1",
      listingId: listing.id,
      plate: "ABC1D23",
      status: "available",
      stockNumber: "stock_1",
      storeId: listing.storeId,
      tenantId: listing.tenantId,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      vin: null,
    });

    const supplier = await createVehicleSupplier(
      context(),
      {
        displayName: "Auto Avaliar",
        kind: "provider",
        provider: "auto_avaliar",
      },
      ports,
    );
    const acquisition = await upsertVehicleUnitAcquisition(
      context(),
      {
        acquisitionPriceCents: 8800000,
        channel: "auto_avaliar",
        supplierId: supplier.id,
        unitId: "unit_1",
      },
      ports,
    );

    expect(acquisition).toMatchObject({
      acquisitionPriceCents: 8800000,
      channel: "auto_avaliar",
      supplierId: supplier.id,
      unitId: "unit_1",
    });
  });

  it("rejects acquisition records linked to suppliers outside the scope", async () => {
    const listing = createListing({ unitIds: ["unit_1"] });
    const ports = createInMemoryVehiclePorts([listing]);
    ports.units.set("unit_1", {
      colorName: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "unit_1",
      listingId: listing.id,
      plate: "ABC1D23",
      status: "available",
      stockNumber: "stock_1",
      storeId: listing.storeId,
      tenantId: listing.tenantId,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      vin: null,
    });

    await expect(
      upsertVehicleUnitAcquisition(
        context(),
        {
          channel: "supplier_company",
          supplierId: "supplier_missing",
          unitId: "unit_1",
        },
        ports,
      ),
    ).rejects.toThrow("Vehicle supplier not found: supplier_missing");
  });
});
