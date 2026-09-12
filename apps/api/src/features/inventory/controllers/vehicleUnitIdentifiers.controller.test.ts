import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory unit identifier routes", () => {
  it("wires Renavam and chassis through unit attachment", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/unit",
      {
        body: JSON.stringify({
          renavam: "12345678901",
          stockNumber: "stock_1",
          vin: "9BWZZZ377VT004251",
        }),
        method: "PUT",
      },
    );

    expect(response.status).toBe(200);
    expect(services.attachListingUnit).toHaveBeenCalledWith(
      expect.any(Object),
      {
        listingId: "listing_1",
        renavam: "12345678901",
        stockNumber: "stock_1",
        vin: "9BWZZZ377VT004251",
      },
    );
  });
});
