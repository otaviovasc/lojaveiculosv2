import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";
import { updateVehicleUnit } from "./updateVehicleUnit.js";

describe("vehicle unit concurrency boundaries", () => {
  it("rejects generic transitions out of workflow-owned unit states", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.update_unit",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1" },
      ports,
    );
    ports.units.set(unit.id, { ...unit, status: "reserved" });

    await expect(
      updateVehicleUnit(
        context,
        { status: "available", unitId: unit.id },
        ports,
      ),
    ).rejects.toThrow("canonical workflow");

    expect(ports.units.get(unit.id)?.status).toBe("reserved");
  });

  it("rejects a stale unit edit instead of overwriting its newer status", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.update_unit",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1" },
      ports,
    );
    ports.unitRepository!.saveIfStatus = vi.fn(async () => null);

    await expect(
      updateVehicleUnit(context, { plate: "DEF4G56", unitId: unit.id }, ports),
    ).rejects.toThrow("changed while the update was being applied");

    expect(ports.units.get(unit.id)?.plate).toBe(unit.plate);
  });
});
