import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";
import { updateVehicleUnit } from "./updateVehicleUnit.js";

describe("VehicleService unit edits", () => {
  it("updates units with actor-aware field-level audit changes", async () => {
    const context = createContext([
      "inventory.create",
      "inventory.update_unit",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1", plate: "ABC1D23", stockNumber: "stock_1" },
      ports,
    );

    const updated = await updateVehicleUnit(
      context,
      {
        plate: "DEF4G56",
        status: "inactive",
        stockNumber: "stock_2",
        unitId: unit.id,
        vin: "vin_2",
      },
      ports,
    );

    expect(updated).toMatchObject({
      plate: "DEF4G56",
      status: "inactive",
      stockNumber: "stock_2",
      vin: "vin_2",
    });
    const event = lastAuditEvent(context.audit.record);
    expect(event.action).toBe("vehicle_unit.update");
    expect(event.actor).toEqual({ id: "user_1", kind: "user" });
    expect(event.entityId).toBe("unit_1");
    expect(event.entityType).toBe("vehicle_unit");
    expect(event.metadata?.listingId).toBe("listing_1");
    expect(event.metadata?.permission).toBe("inventory.update_unit");
    expect(event.relatedEntities).toEqual([
      { id: "listing_1", type: "vehicle_listing" },
    ]);
    expect(event.changes).toContainEqual({
      after: "DEF4G56",
      before: "ABC1D23",
      path: "unit.plate",
    });
    expect(event.changes).toContainEqual({
      after: "stock_2",
      before: "stock_1",
      path: "unit.stockNumber",
    });
    expect(event.changes).toContainEqual({
      after: "vin_2",
      before: null,
      path: "unit.vin",
    });
    expect(event.changes).toContainEqual({
      after: "inactive",
      before: "available",
      path: "unit.status",
    });
  });
});

function lastAuditEvent(record: (event: AuditEvent) => Promise<void>) {
  const calls = vi.mocked(record).mock.calls;
  const event = calls.at(-1)?.[0];

  if (!event) throw new Error("Expected an audit event.");

  return event;
}
