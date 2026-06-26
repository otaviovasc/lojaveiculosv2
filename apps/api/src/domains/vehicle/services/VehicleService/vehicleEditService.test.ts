import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { updateVehicleListingDetails } from "./updateVehicleListingDetails.js";
import { updateVehicleUnit } from "./updateVehicleUnit.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";

describe("VehicleService edits", () => {
  it("updates listing details with field-level audit changes", async () => {
    const context = createContext([
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_status",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    const listing = await updateVehicleListingDetails(
      context,
      {
        description: "Updated",
        listingId: "listing_1",
        priceCents: 10000000,
        status: "published",
        title: "Updated Vehicle",
      },
      ports,
    );

    expect(listing).toMatchObject({
      description: "Updated",
      priceCents: 10000000,
      status: "published",
      title: "Updated Vehicle",
    });
    const event = lastAuditEvent(context.audit.record);
    expect(event.action).toBe("vehicle_listing.details.update");
    expect(event.entityId).toBe("listing_1");
    expect(event.metadata?.permission).toBe("inventory.update_description");
    expect(event.metadata?.requiredPermissions).toEqual([
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_status",
    ]);
    expect(event.changes).toContainEqual({
      after: "Updated Vehicle",
      before: "Vehicle",
      path: "title",
    });
    expect(event.changes).toContainEqual({
      after: "Updated",
      before: null,
      path: "description",
    });
    expect(event.changes).toContainEqual({
      after: 10000000,
      before: 9500000,
      path: "priceCents",
    });
    expect(event.changes).toContainEqual({
      after: "published",
      before: "draft",
      path: "status",
    });
    const operationsRepository = ports.operationsRepository;
    if (!operationsRepository) throw new Error("Expected operations port.");
    await expect(
      operationsRepository.listPriceHistoryByListing({
        listingId: "listing_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        newPriceCents: 10000000,
        oldPriceCents: 9500000,
      }),
    ]);
    await expect(
      operationsRepository.listStatusHistoryByListing({
        listingId: "listing_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fromStatus: "draft",
        target: "listing",
        toStatus: "published",
      }),
    ]);
  });

  it("allows no-op listing edits with the submitted write permission", async () => {
    const context = createContext(["inventory.update_price"]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    const listing = await updateVehicleListingDetails(
      context,
      { listingId: "listing_1", priceCents: 9500000 },
      ports,
    );

    expect(listing.priceCents).toBe(9500000);
    const event = lastAuditEvent(context.audit.record);
    expect(event.metadata?.permission).toBe("inventory.update_price");
    expect(event.metadata?.requiredPermissions).toEqual([
      "inventory.update_price",
    ]);
    expect(event.changes).toEqual([]);
  });

  it("updates internal notes with a dedicated permission and redacted audit", async () => {
    const context = createContext(["inventory.update_internal_notes"]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    const listing = await updateVehicleListingDetails(
      context,
      { internalNotes: "Preparacao pendente.", listingId: "listing_1" },
      ports,
    );

    expect(listing.internalNotes).toBe("Preparacao pendente.");
    const event = lastAuditEvent(context.audit.record);
    expect(event.metadata?.permission).toBe("inventory.update_internal_notes");
    expect(event.metadata?.requiredPermissions).toEqual([
      "inventory.update_internal_notes",
    ]);
    expect(event.changes).toContainEqual({
      after: "[set]",
      before: null,
      path: "internalNotes",
    });
  });

  it("checks submitted edit permission before scoped listing lookup", async () => {
    const context = createContext([]);
    const ports = createInMemoryVehiclePorts([]);

    await expect(
      updateVehicleListingDetails(
        context,
        { listingId: "missing_listing", priceCents: 9500000 },
        ports,
      ),
    ).rejects.toThrow("Missing permission: inventory.update_price");
  });

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
