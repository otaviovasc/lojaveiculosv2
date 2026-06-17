import { describe, expect, it } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { changeVehicleStatus } from "./changeVehicleStatus.js";
import { createVehicleListing } from "./createVehicleListing.js";
import { getVehicleListing } from "./getVehicleListing.js";
import { updateVehicleDescription } from "./updateVehicleDescription.js";
import { updateVehiclePrice } from "./updateVehiclePrice.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("VehicleService", () => {
  it("creates vehicle listings with scoped audit", async () => {
    const context = createContext(["inventory.create"]);
    const ports = createInMemoryVehiclePorts();

    const listing = await createVehicleListing(
      context,
      { plate: "ABC1D23", title: "Civic" },
      ports,
    );

    expect(listing.id).toBe("listing_1");
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_listing.create",
        entityId: "listing_1",
      }),
    );
  });

  it("reads only store-scoped listings", async () => {
    const context = createContext(["inventory.read"]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    await expect(
      getVehicleListing(context, { listingId: "listing_1" }, ports),
    ).resolves.toMatchObject({ id: "listing_1" });

    const otherStoreContext = {
      ...context,
      storeId: "store_2",
    };
    await expect(
      getVehicleListing(otherStoreContext, { listingId: "listing_1" }, ports),
    ).rejects.toThrow("Vehicle listing not found");
  });

  it("uses separate description and price permissions", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);

    await updateVehicleDescription(
      createContext(["inventory.update_description"]),
      { description: "Updated", listingId: "listing_1" },
      ports,
    );

    await expect(
      updateVehiclePrice(
        createContext(["inventory.update_description"]),
        { listingId: "listing_1", priceCents: 100 },
        ports,
      ),
    ).rejects.toThrow("Missing permission: inventory.update_price");
  });

  it("attaches units and changes status with audit", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.update_status",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1", stockNumber: "stock_1" },
      ports,
    );
    const listing = await changeVehicleStatus(
      context,
      { listingId: "listing_1", status: "available" },
      ports,
    );

    expect(unit.id).toBe("unit_1");
    expect(listing.status).toBe("available");
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.status.change" }),
    );
  });
});
