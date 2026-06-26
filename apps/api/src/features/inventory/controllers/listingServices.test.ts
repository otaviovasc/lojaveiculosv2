import { describe, expect, it, vi } from "vitest";
import {
  createInMemoryVehiclePorts,
  createListing,
} from "../../../domains/vehicle/services/VehicleService/testSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  createInventoryListingServices,
  type DrizzleVehicleInventoryAdapter,
} from "./listingServices.js";
import { attachVehicleUnit } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import type { DrizzleVehicleInventoryClient } from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";

describe("inventory listing services factory", () => {
  it("uses in-memory inventory ports by default", async () => {
    const services = createInventoryListingServices();
    const context = createContext(["inventory.create", "inventory.read"]);

    const created = await services.createListing(context, {
      plate: "ABC1D23",
      title: "Fiat Toro",
    });
    const found = await services.getListing(context, {
      listingId: created.listing.id,
    });

    expect(created.listing).toMatchObject({ id: "listing_1" });
    expect(found).toEqual(created);
  });

  it("uses an injected Drizzle adapter when a client is supplied", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const adapter: DrizzleVehicleInventoryAdapter = vi.fn(() => ports);
    const client = {} as DrizzleVehicleInventoryClient;
    const services = createInventoryListingServices({
      drizzleAdapter: adapter,
      drizzleClient: client,
    });

    const result = await services.getListing(
      createContext(["inventory.read"]),
      {
        listingId: "listing_1",
      },
    );

    expect(result.listing.id).toBe("listing_1");
    expect(adapter).toHaveBeenCalledWith(client);
    expect(ports.listingRepository.findById).toHaveBeenCalledWith({
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("passes media requests through the injected ports", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const services = createInventoryListingServices({ ports });
    const context = createContext(["inventory.create"]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1" },
      ports,
    );

    const upload = await services.requestMediaUpload(context, {
      contentType: "image/jpeg",
      fileName: "front.jpg",
      kind: "photo",
      sizeBytes: 1024,
      unitId: unit.id,
    });
    const media = await services.createMedia(context, {
      kind: "photo",
      storageKey: upload.storageKey,
      unitId: unit.id,
    });

    expect(media).toEqual({
      mediaId: "media_1",
      storageKey: upload.storageKey,
      status: "created",
      unitId: unit.id,
      url: `https://cdn.local/${upload.storageKey}`,
    });
  });

  it("returns created listing detail without requiring inventory.read", async () => {
    const services = createInventoryListingServices();

    const result = await services.createListing(
      createContext(["inventory.create"]),
      {
        plate: "ABC1D23",
        title: "Fiat Toro",
      },
    );

    expect(result.listing).toMatchObject({
      id: "listing_1",
      title: "Fiat Toro",
    });
  });

  it("returns edited listing detail under the matching write permission", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const services = createInventoryListingServices({ ports });

    const result = await services.updateListingPrice(
      createContext(["inventory.update_price"]),
      { listingId: "listing_1", priceCents: 12000000 },
    );

    expect(result.listing.priceCents).toBe(12000000);
  });

  it("returns edited unit detail under the unit write permission", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const services = createInventoryListingServices({ ports });
    await services.attachListingUnit(createContext(["inventory.create"]), {
      listingId: "listing_1",
      plate: "ABC1D23",
    });

    const result = await services.updateListingUnit(
      createContext(["inventory.update_unit"]),
      {
        plate: "DEF4G56",
        unitId: "unit_1",
      },
    );

    expect(result.units[0]).toMatchObject({ id: "unit_1", plate: "DEF4G56" });
  });

  it("lists stock summaries through injected ports", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Fiat Toro" }),
      createListing({ id: "listing_2", title: "Honda Civic" }),
    ]);
    const services = createInventoryListingServices({ ports });

    const result = await services.listListings(
      createContext(["inventory.read"]),
      {
        search: "toro",
      },
    );

    expect(result).toMatchObject({
      hasMore: false,
      items: [{ listing: { id: "listing_1", title: "Fiat Toro" } }],
      nextOffset: null,
      total: 1,
    });
  });

  it("paginates stock summaries without dropping later listings", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({ id: "listing_1", title: "Fiat Toro" }),
      createListing({ id: "listing_2", title: "Honda Civic" }),
      createListing({ id: "listing_3", title: "Jeep Compass" }),
    ]);
    const services = createInventoryListingServices({ ports });

    const firstPage = await services.listListings(
      createContext(["inventory.read"]),
      { limit: 2 },
    );
    const secondPage = await services.listListings(
      createContext(["inventory.read"]),
      { limit: 2, offset: firstPage.nextOffset ?? 0 },
    );

    expect(firstPage).toMatchObject({
      hasMore: true,
      items: [
        { listing: { id: "listing_1" } },
        { listing: { id: "listing_2" } },
      ],
      nextOffset: 2,
      total: 2,
    });
    expect(secondPage).toMatchObject({
      hasMore: false,
      items: [{ listing: { id: "listing_3" } }],
      nextOffset: null,
      total: 3,
    });
  });
});

function createContext(permissions: string[]) {
  return createServiceContext({
    permissions,
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
