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
  hasMore?: boolean;
  items?: readonly { listing?: { id?: string }; units?: unknown[] }[];
  nextOffset?: number | null;
  total?: number;
};

describe("inventory read routes", () => {
  it("wires list listing requests to the service boundary", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/listings?search=toro&status=published&limit=20&offset=40",
    );
    const body = (await response.json()) as ListingListBody;

    expect(response.status).toBe(200);
    expect(body.hasMore).toBe(false);
    expect(body.nextOffset).toBeNull();
    expect(body.total).toBe(1);
    expect(body.items?.[0]?.listing?.id).toBe("listing_1");
    expect(body.items?.[0]?.units).toHaveLength(1);
    expect(services.listListings).toHaveBeenCalledWith(expect.any(Object), {
      limit: 20,
      offset: 40,
      search: "toro",
      status: "published",
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
