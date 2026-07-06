import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory listing delete route", () => {
  it("wires listing deletion to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1", {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(services.deleteListing).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
    });
  });
});
