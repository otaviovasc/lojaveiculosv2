import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory publication routes", () => {
  it("wires explicit listing publication to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/publish",
      {
        body: JSON.stringify({
          publicSlug: "toro-volcano",
          reason: "Ready",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(services.publishListing).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
      publicSlug: "toro-volcano",
      reason: "Ready",
    });
  });

  it("wires explicit listing unpublication to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/unpublish",
      {
        body: JSON.stringify({ reason: "Maintenance" }),
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(services.unpublishListing).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
      reason: "Maintenance",
    });
  });
});
