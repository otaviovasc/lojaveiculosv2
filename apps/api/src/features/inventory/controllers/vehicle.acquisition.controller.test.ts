import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory acquisition controller", () => {
  it("routes supplier CRUD through inventory services", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const list = await app.request("/api/v1/inventory/suppliers?limit=25");
    expect(list.status).toBe(200);
    expect(services.listVehicleSuppliers).toHaveBeenCalledWith(
      expect.any(Object),
      { limit: 25 },
    );

    const created = await app.request("/api/v1/inventory/suppliers", {
      body: JSON.stringify({
        displayName: "Auto Avaliar",
        kind: "provider",
        provider: "auto_avaliar",
      }),
      method: "POST",
    });
    expect(created.status).toBe(201);
    expect(services.createVehicleSupplier).toHaveBeenCalledWith(
      expect.any(Object),
      {
        displayName: "Auto Avaliar",
        kind: "provider",
        provider: "auto_avaliar",
      },
    );

    const updated = await app.request(
      "/api/v1/inventory/suppliers/supplier_1",
      {
        body: JSON.stringify({ phone: "11999999999" }),
        method: "PATCH",
      },
    );
    expect(updated.status).toBe(200);
    expect(services.updateVehicleSupplier).toHaveBeenCalledWith(
      expect.any(Object),
      { phone: "11999999999", supplierId: "supplier_1" },
    );

    const archived = await app.request(
      "/api/v1/inventory/suppliers/supplier_1",
      { method: "DELETE" },
    );
    expect(archived.status).toBe(200);
    expect(services.archiveVehicleSupplier).toHaveBeenCalledWith(
      expect.any(Object),
      { supplierId: "supplier_1" },
    );
  });

  it("routes unit acquisition source reads and writes", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const loaded = await app.request(
      "/api/v1/inventory/listings/listing_1/units/unit_1/acquisition",
    );
    expect(loaded.status).toBe(200);
    expect(services.getVehicleUnitAcquisition).toHaveBeenCalledWith(
      expect.any(Object),
      { listingId: "listing_1", unitId: "unit_1" },
    );

    const saved = await app.request(
      "/api/v1/inventory/listings/listing_1/units/unit_1/acquisition",
      {
        body: JSON.stringify({
          acquisitionPriceCents: 9000000,
          channel: "auto_avaliar",
          commissionTiming: "closed",
          supplierId: null,
        }),
        method: "PUT",
      },
    );
    expect(saved.status).toBe(200);
    expect(services.upsertVehicleUnitAcquisition).toHaveBeenCalledWith(
      expect.any(Object),
      {
        acquisitionPriceCents: 9000000,
        channel: "auto_avaliar",
        commissionTiming: "closed",
        listingId: "listing_1",
        supplierId: null,
        unitId: "unit_1",
      },
    );
  });
});
