import { describe, expect, it, vi } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";
import { VehicleListingDeletionStateError } from "../../../domains/vehicle/services/VehicleService/deleteVehicleListing.js";

describe("inventory listing delete route", () => {
  it("wires listing deletion to the planned service name", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1", {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(services.deleteListing).toHaveBeenCalledWith(expect.any(Object), {
      listingId: "listing_1",
    });
  });

  it("returns a scoped conflict when operational state blocks deletion", async () => {
    const services = createInventoryTestServices();
    vi.mocked(services.deleteListing).mockRejectedValueOnce(
      new VehicleListingDeletionStateError(["reserved"]),
    );
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings/listing_1", {
      method: "DELETE",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "VEHICLE_DELETE_CONFLICT",
      details: { blockingStatuses: ["reserved"] },
    });
  });
});
