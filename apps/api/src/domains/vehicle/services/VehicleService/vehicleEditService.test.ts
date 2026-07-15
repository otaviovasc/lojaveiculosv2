import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { updateVehicleListingDetails } from "./updateVehicleListingDetails.js";
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

  it("persists public listing tags and video with dedicated permissions", async () => {
    const context = createContext([
      "inventory.update_commercial_tags",
      "inventory.update_video",
    ]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    const listing = await updateVehicleListingDetails(
      context,
      {
        commercialTags: ["Único dono", "Revisado"],
        listingId: "listing_1",
        videoUrl: "https://www.youtube.com/watch?v=vehicle-demo",
      },
      ports,
    );

    expect(listing.commercialTags).toEqual(["Único dono", "Revisado"]);
    expect(listing.videoUrl).toBe(
      "https://www.youtube.com/watch?v=vehicle-demo",
    );
    const event = lastAuditEvent(context.audit.record);
    expect(event.metadata?.requiredPermissions).toEqual([
      "inventory.update_commercial_tags",
      "inventory.update_video",
    ]);
    expect(event.changes).toContainEqual({
      after: ["Único dono", "Revisado"],
      before: [],
      path: "commercialTags",
    });
    expect(event.changes).toContainEqual({
      after: "https://www.youtube.com/watch?v=vehicle-demo",
      before: null,
      path: "videoUrl",
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
});

function lastAuditEvent(record: (event: AuditEvent) => Promise<void>) {
  const calls = vi.mocked(record).mock.calls;
  const event = calls.at(-1)?.[0];

  if (!event) throw new Error("Expected an audit event.");

  return event;
}
