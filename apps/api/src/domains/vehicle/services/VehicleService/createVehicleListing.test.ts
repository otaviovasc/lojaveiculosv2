import { describe, expect, it, vi } from "vitest";
import { createVehicleListing } from "./createVehicleListing.js";
import { createContext, createInMemoryVehiclePorts } from "./testSupport.js";

describe("VehicleService create listing denials", () => {
  it("rejects listing creation without a store-scoped context and audits the denial", async () => {
    const context = {
      ...createContext(["inventory.create"]),
      storeId: null,
      tenantId: null,
    };
    const ports = createInMemoryVehiclePorts();

    await expect(
      createVehicleListing(
        context,
        { plate: "ABC1D23", title: "Civic" },
        ports,
      ),
    ).rejects.toThrow("store-scoped context");

    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_listing.create",
        outcome: "denied",
        metadata: expect.objectContaining({
          denialReason: "missing_scope",
        }) as unknown as Record<string, unknown>,
      }),
    );
  });

  it("rejects listing creation without permission and audits the denial", async () => {
    const context = createContext([]);
    const ports = createInMemoryVehiclePorts();

    await expect(
      createVehicleListing(
        context,
        { plate: "ABC1D23", title: "Civic" },
        ports,
      ),
    ).rejects.toThrow("Missing permission: inventory.create");

    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_listing.create",
        outcome: "denied",
        metadata: expect.objectContaining({
          denialReason: "missing_permission",
        }) as unknown as Record<string, unknown>,
      }),
    );
  });

  it("rejects aggregate-only statuses on creation and audits the denial", async () => {
    const context = createContext(["inventory.create"]);
    const ports = createInMemoryVehiclePorts();

    await expect(
      createVehicleListing(
        context,
        { plate: "ABC1D23", title: "Civic", status: "sold_out" },
        ports,
      ),
    ).rejects.toThrow("must be changed through the canonical workflow");

    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_listing.create",
        outcome: "denied",
        metadata: expect.objectContaining({
          denialReason: "invalid_status",
        }) as unknown as Record<string, unknown>,
      }),
    );
  });

  it("rejects before persistence when the vehicle quota is exhausted", async () => {
    const context = createContext(["inventory.create"]);
    const ports = Object.assign(createInMemoryVehiclePorts(), {
      quotaGuard: {
        assertAvailable: async () => {
          throw new Error("quota exceeded");
        },
      },
    });
    const create = vi.spyOn(ports.listingRepository, "create");

    await expect(
      createVehicleListing(
        context,
        { plate: "ABC1D23", title: "Civic" },
        ports,
      ),
    ).rejects.toThrow("quota exceeded");

    expect(create).not.toHaveBeenCalled();
  });
});
