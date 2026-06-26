import { describe, expect, it } from "vitest";
import { listVehicleUnits } from "./listVehicleUnits.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("listVehicleUnits", () => {
  it("finds matching units beyond the first internal search page", async () => {
    const context = createContext(["inventory.read"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Generic Hatch" }),
      createListing({ id: "listing_2", title: "Rare Green M3" }),
    ]);

    for (let index = 0; index < 501; index += 1) {
      ports.units.set(
        `unit_${index}`,
        unitRecord(`unit_${index}`, "listing_1"),
      );
    }
    ports.units.set("unit_target", {
      ...unitRecord("unit_target", "listing_2"),
      colorName: "green",
      stockNumber: "M3-GREEN",
    });

    const result = await listVehicleUnits(
      context,
      { search: "rare green", limit: 10 },
      ports,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.unit.id).toBe("unit_target");
  });
});

function unitRecord(id: string, listingId: string) {
  return {
    colorName: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    id,
    listingId,
    plate: null,
    status: "available" as const,
    stockNumber: `GEN-${id}`,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    vin: null,
  };
}
