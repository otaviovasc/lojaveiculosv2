import { describe, expect, it } from "vitest";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { changeVehicleStatus } from "./changeVehicleStatus.js";
import { createVehicleListing } from "./createVehicleListing.js";
import {
  createVehicleMedia,
  VehicleMediaStorageScopeError,
} from "./createVehicleMedia.js";
import { getVehicleListingDetail } from "./getVehicleListingDetail.js";
import { getVehicleListing } from "./getVehicleListing.js";
import { listVehicleListings } from "./listVehicleListings.js";
import { requestVehicleMediaUpload } from "./requestVehicleMediaUpload.js";
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
        failureTier: "important",
        outcome: "succeeded",
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
      { listingId: "listing_1", status: "published" },
      ports,
    );

    expect(unit.id).toBe("unit_1");
    expect(listing.status).toBe("published");
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.status.change" }),
    );
  });

  it("requests scoped media uploads and stores confirmed media records", async () => {
    const context = createContext(["inventory.create"]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    const upload = await requestVehicleMediaUpload(
      context,
      {
        contentType: "image/jpeg",
        fileName: "front.jpg",
        kind: "photo",
        listingId: "listing_1",
        sizeBytes: 2048,
      },
      ports,
    );
    const media = await createVehicleMedia(
      context,
      {
        altText: "Front photo",
        kind: "photo",
        listingId: "listing_1",
        storageKey: upload.storageKey,
      },
      ports,
    );

    expect(upload.storageKey).toBe(
      "tenants/tenant_1/stores/store_1/listings/listing_1/photo/front.jpg",
    );
    expect(media).toMatchObject({
      altText: "Front photo",
      id: "media_1",
      listingId: "listing_1",
      url: `https://cdn.local/${upload.storageKey}`,
    });
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_media.create" }),
    );
  });

  it("rejects media storage keys outside the scoped listing folder", async () => {
    const context = createContext(["inventory.create"]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    await expect(
      createVehicleMedia(
        context,
        {
          kind: "photo",
          listingId: "listing_1",
          storageKey:
            "tenants/tenant_1/stores/store_2/listings/listing_1/front.jpg",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(VehicleMediaStorageScopeError);
  });

  it("returns listing detail with scoped units and media", async () => {
    const context = createContext(["inventory.create", "inventory.read"]);
    const ports = createInMemoryVehiclePorts([createListing()]);

    await attachVehicleUnit(
      context,
      { listingId: "listing_1", stockNumber: "stock_1" },
      ports,
    );
    const upload = await requestVehicleMediaUpload(
      context,
      {
        contentType: "image/jpeg",
        fileName: "front.jpg",
        kind: "photo",
        listingId: "listing_1",
        sizeBytes: 2048,
      },
      ports,
    );
    await createVehicleMedia(
      context,
      { kind: "photo", listingId: "listing_1", storageKey: upload.storageKey },
      ports,
    );

    const detail = await getVehicleListingDetail(
      context,
      { listingId: "listing_1" },
      ports,
    );

    expect(detail.listing.id).toBe("listing_1");
    expect(detail.units).toHaveLength(1);
    expect(detail.media).toHaveLength(1);
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.detail.read" }),
    );
  });

  it("lists vehicle inventory with search and scoped audit", async () => {
    const context = createContext(["inventory.read"]);
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Fiat Toro" }),
      createListing({ id: "listing_2", title: "Honda Civic" }),
    ]);

    const result = await listVehicleListings(
      context,
      { search: "toro" },
      ports,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.listing.id).toBe("listing_1");
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vehicle_listing.list.read" }),
    );
  });
});
