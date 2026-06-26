import { describe, expect, it } from "vitest";
import { addVehicleCost } from "./addVehicleCost.js";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("VehicleService cost finance entries", () => {
  it("mirrors vehicle costs into finance entries with typed links", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.cost_create",
    ]);
    const ports = createInMemoryVehiclePorts([
      createListing({ unitIds: ["unit_1"] }),
    ]);
    await attachVehicleUnit(context, { listingId: "listing_1" }, ports);

    const cost = await addVehicleCost(
      context,
      {
        amountCents: 120000,
        description: "Preparacao",
        kind: "preparation",
        unitId: "unit_1",
      },
      ports,
    );

    expect(cost.id).toBe("cost_1");
    const [entry] = ports.financeRepository.entries;
    expect(entry).toMatchObject({
      amountCents: 120000,
      category: "vehicle_preparation",
      status: "paid",
      type: "expense",
    });
    expect(
      ports.financeRepository.links.map((link) => link.targetType),
    ).toEqual(["vehicle_cost", "vehicle_unit"]);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_cost.create" }),
    );
  });
});
