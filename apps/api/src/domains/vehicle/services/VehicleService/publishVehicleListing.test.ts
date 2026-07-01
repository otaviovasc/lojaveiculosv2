import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import {
  createContext,
  createInMemoryVehiclePorts,
  createListing,
} from "./testSupport.js";
import {
  publishVehicleListing,
  unpublishVehicleListing,
  VehiclePublicationValidationError,
} from "./publishVehicleListing.js";

describe("publishVehicleListing", () => {
  it("publishes a listing with a generated public slug and audit history", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_abc123", title: "Fiat Toro Volcano" }),
    ]);
    const context = createContext(["inventory.update_status"]);

    const listing = await publishVehicleListing(
      context,
      { listingId: "listing_abc123", reason: "Ready for public site" },
      ports,
    );

    expect(listing.status).toBe("published");
    expect(listing.isVisibleOnPublicSite).toBe(true);
    expect(listing.publicSlug).toBe("fiat-toro-volcano-listing-abc123");
    expect(ports.operationsRepository.statuses).toEqual([
      expect.objectContaining({
        fromStatus: "draft",
        listingId: "listing_abc123",
        reason: "Ready for public site",
        target: "listing",
        toStatus: "published",
      }),
    ]);
    const auditEvent = vi.mocked(context.audit.record).mock.calls[0]?.[0];
    expect(auditEvent?.action).toBe("vehicle_listing.publication.publish");
    expect(auditEvent?.changes).toContainEqual({
      after: "published",
      before: "draft",
      path: "status",
    });
    expect(auditEvent?.changes).toContainEqual({
      after: true,
      before: false,
      path: "isVisibleOnPublicSite",
    });
    expect(auditEvent?.changes).toContainEqual({
      after: "fiat-toro-volcano-listing-abc123",
      before: null,
      path: "publicSlug",
    });
  });

  it("normalizes an explicit slug when publishing", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Vehicle" }),
    ]);

    const listing = await publishVehicleListing(
      createContext(["inventory.update_status"]),
      { listingId: "listing_1", publicSlug: " Toro  Volcano 4x4 " },
      ports,
    );

    expect(listing.publicSlug).toBe("toro-volcano-4x4");
  });

  it("rejects explicit public slug collisions", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", publicSlug: "toro-volcano" }),
      createListing({ id: "listing_2", title: "Fiat Toro Volcano" }),
    ]);

    await expect(
      publishVehicleListing(
        createContext(["inventory.update_status"]),
        { listingId: "listing_2", publicSlug: " Toro Volcano " },
        ports,
      ),
    ).rejects.toThrow("Vehicle listing public slug is already in use.");
  });

  it("preserves the listing id suffix for long generated public slugs", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({
        id: "listing_abc123",
        title: "Fiat Toro Volcano ".repeat(30),
      }),
    ]);

    const listing = await publishVehicleListing(
      createContext(["inventory.update_status"]),
      { listingId: "listing_abc123" },
      ports,
    );

    expect(listing.publicSlug?.length).toBeLessThanOrEqual(191);
    expect(listing.publicSlug).toMatch(/-listing-abc123$/);
  });

  it("unpublishes without dropping the existing public slug", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({
        id: "listing_1",
        isVisibleOnPublicSite: true,
        publicSlug: "toro-volcano",
        status: "published",
      }),
    ]);

    const listing = await unpublishVehicleListing(
      createContext(["inventory.update_status"]),
      { listingId: "listing_1", reason: "Maintenance" },
      ports,
    );

    expect(listing.status).toBe("unpublished");
    expect(listing.isVisibleOnPublicSite).toBe(false);
    expect(listing.publicSlug).toBe("toro-volcano");
    expect(ports.operationsRepository.statuses[0]).toEqual(
      expect.objectContaining({
        fromStatus: "published",
        reason: "Maintenance",
        toStatus: "unpublished",
      }),
    );
  });

  it("rejects terminal listing states", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", status: "sold_out" }),
    ]);

    await expect(
      publishVehicleListing(
        createContext(["inventory.update_status"]),
        { listingId: "listing_1" },
        ports,
      ),
    ).rejects.toThrow(VehiclePublicationValidationError);
  });

  it("requires update status permission", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);

    await expect(
      publishVehicleListing(
        createContext([]),
        { listingId: "listing_1" },
        ports,
      ),
    ).rejects.toThrow(AuthorizationError);
  });
});
