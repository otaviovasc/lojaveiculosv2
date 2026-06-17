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
      listingId: created.listingId,
    });

    expect(created).toEqual({
      listingId: "listing_1",
      status: "not_implemented",
    });
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

    expect(result.listingId).toBe("listing_1");
    expect(adapter).toHaveBeenCalledWith(client);
    expect(ports.listingRepository.findById).toHaveBeenCalledWith({
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
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
