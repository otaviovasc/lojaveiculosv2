import { describe, expect, it, vi } from "vitest";
import {
  createContext,
  createListing,
} from "../../testSupportVehicleServiceFixtures.js";
import { createInMemoryVehiclePorts } from "../../testSupportVehicleServiceInventoryPorts.js";
import { listVehicleAuditEvents } from "./listVehicleAuditEvents.js";

describe("listVehicleAuditEvents", () => {
  it("queries the audit store with the resolved vehicle scope", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const event = {
      action: "vehicle_listing.details.update",
      actorId: "user_1",
      actorKind: "user" as const,
      category: "data_change" as const,
      changes: [],
      id: "audit_1",
      occurredAt: new Date("2026-07-14T12:00:00.000Z"),
      outcome: "succeeded" as const,
      providerName: null,
      summary: "Updated vehicle listing",
    };
    const listByEntityIds = vi.fn(async () => [event]);
    ports.auditRepository = { listByEntityIds };

    const events = await listVehicleAuditEvents(
      createContext(["inventory.read"]),
      { listingId: "listing_1" },
      ports,
    );

    expect(events).toEqual([event]);
    expect(listByEntityIds).toHaveBeenCalledWith({
      entityIds: ["listing_1"],
      limit: 50,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("fails honestly when the audit store is unavailable", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);

    await expect(
      listVehicleAuditEvents(
        createContext(["inventory.read"]),
        { listingId: "listing_1" },
        ports,
      ),
    ).rejects.toThrow("Vehicle audit repository is not configured.");
  });
});
