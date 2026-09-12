import { describe, expect, it, vi } from "vitest";
import { listVehicleListings } from "./listVehicleListings.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("listVehicleListings", () => {
  it("lists vehicle inventory with search and scoped audit", async () => {
    const context = createContext(["inventory.read"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Fiat Toro" }),
      createListing({ id: "listing_2", title: "Honda Civic" }),
    ]);

    const result = await listVehicleListings(
      context,
      { search: "toro" },
      ports,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.listing.id).toBe("listing_1");
    expect(result.items[0]?.leadsCount).toBe(0);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.list.read" }),
    );
  });

  it("includes real CRM leads counts per listing when the counter port is configured", async () => {
    const context = createContext(["inventory.read"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Fiat Toro" }),
      createListing({ id: "listing_2", title: "Honda Civic" }),
    ]);
    const countLeadsByListingIds = vi.fn(
      async () => new Map([["listing_2", 4]]),
    );
    ports.leadInterestCounter = { countLeadsByListingIds };

    const result = await listVehicleListings(context, {}, ports);

    expect(countLeadsByListingIds).toHaveBeenCalledWith({
      listingIds: ["listing_1", "listing_2"],
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
    expect(
      result.items.find((item) => item.listing.id === "listing_1")?.leadsCount,
    ).toBe(0);
    expect(
      result.items.find((item) => item.listing.id === "listing_2")?.leadsCount,
    ).toBe(4);
  });
});
