import { describe, expect, it } from "vitest";
import type { VehicleUnit } from "../../ports/vehicleInventoryRepository.js";
import { deleteVehicleListing } from "./deleteVehicleListing.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
  testNow,
} from "./testSupport.js";

describe("VehicleService delete listing", () => {
  it("soft deletes the scoped listing and all scoped units with audit", async () => {
    const context = createContext(["inventory.delete"]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    ports.units.set("unit_1", unitRecord("unit_1", "listing_1"));
    ports.units.set("unit_2", unitRecord("unit_2", "listing_1"));

    const deleted = await deleteVehicleListing(
      context,
      { listingId: "listing_1", reason: "duplicate" },
      ports,
    );

    expect(deleted.id).toBe("listing_1");
    expect(ports.listings.has("listing_1")).toBe(false);
    expect(ports.units.has("unit_1")).toBe(false);
    expect(ports.units.has("unit_2")).toBe(false);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_listing.delete",
        entityId: "listing_1",
        metadata: expect.objectContaining({
          reason: "duplicate",
          unitCount: 2,
        }) as unknown as Record<string, unknown>,
        outcome: "succeeded",
      }),
    );
  });

  it("requires the inventory delete permission", async () => {
    await expect(
      deleteVehicleListing(
        createContext(["inventory.read"]),
        { listingId: "listing_1" },
        createInMemoryVehiclePorts([createListing()]),
      ),
    ).rejects.toThrow("Missing permission: inventory.delete");
  });
});

function unitRecord(id: string, listingId: string): VehicleUnit {
  return {
    colorName: null,
    createdAt: testNow,
    id,
    listingId,
    plate: null,
    status: "available",
    stockNumber: null,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: testNow,
    vin: null,
  };
}
