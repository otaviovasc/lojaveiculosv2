import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory catalog controller", () => {
  it("routes cached brand, model, version, year, and snapshot lookups", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    await app.request("/api/v1/inventory/catalog/brands?vehicleType=cars");
    await app.request(
      "/api/v1/inventory/catalog/brands/21/models?vehicleType=cars",
    );
    await app.request(
      "/api/v1/inventory/catalog/brands/21/models/toro/versions?vehicleType=cars",
    );
    await app.request(
      "/api/v1/inventory/catalog/brands/21/versions/4828/years?vehicleType=cars",
    );
    const snapshotResponse = await app.request(
      "/api/v1/inventory/catalog/snapshot?vehicleType=cars&brandCode=21&modelCode=4828&yearCode=2024-1",
    );

    await expect(snapshotResponse.json()).resolves.toMatchObject({
      brandName: "Fiat",
      modelName: "Toro Volcano",
      source: "fipe",
    });
    expect(services.listCatalogBrands).toHaveBeenCalledWith(expect.anything(), {
      vehicleType: "cars",
    });
    expect(services.listCatalogVersions).toHaveBeenCalledWith(
      expect.anything(),
      { brandCode: "21", modelFamilyCode: "toro", vehicleType: "cars" },
    );
    expect(services.getCatalogSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      {
        brandCode: "21",
        modelCode: "4828",
        vehicleType: "cars",
        yearCode: "2024-1",
      },
    );
  });
});
