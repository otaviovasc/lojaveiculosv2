import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

type ListingDetailBody = {
  listing?: { id?: string };
  media?: unknown;
  status?: string;
  units?: unknown;
};

type ListingListBody = {
  items?: readonly { listing?: { id?: string } }[];
  total?: number;
};

describe("inventory read routes", () => {
  it("wires list listing requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings?search=toro&status=available&limit=20",
    );
    const body = (await response.json()) as ListingListBody;

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items?.[0]?.listing?.id).toBe("listing_1");
    expect(services.listListings).toHaveBeenCalledWith(expect.any(Object), {
      limit: 20,
      search: "toro",
      status: "available",
    });
  });

  it("wires get listing requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1");
    const body = (await response.json()) as ListingDetailBody;

    expect(response.status).toBe(200);
    expect(body.listing?.id).toBe("listing_1");
    expect(Array.isArray(body.media)).toBe(true);
    expect(Array.isArray(body.units)).toBe(true);
    expect(services.getListing).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
    });
  });
});
