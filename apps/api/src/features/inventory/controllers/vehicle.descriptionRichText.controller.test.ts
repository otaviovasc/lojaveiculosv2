import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

const structuredDescription = "\n**negrito** 🚗\r\n\r\nLinha com detalhe\n";
const normalizedDescription = "\n**negrito** 🚗\n\nLinha com detalhe\n";

describe("inventory rich text description routes", () => {
  it("preserves structured description content on create", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({
        description: structuredDescription,
        plate: "ABC1D23",
        title: "Fiat Toro",
      }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(services.createListing).toHaveBeenCalledWith(expect.any(Object), {
      description: normalizedDescription,
      plate: "ABC1D23",
      title: "Fiat Toro",
    });
  });

  it("preserves structured description content on update", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings/listing_1/description",
      {
        body: JSON.stringify({ description: structuredDescription }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateListingDescription).toHaveBeenCalledWith(
      expect.any(Object),
      {
        description: normalizedDescription,
        listingId: "listing_1",
      },
    );
  });
});
