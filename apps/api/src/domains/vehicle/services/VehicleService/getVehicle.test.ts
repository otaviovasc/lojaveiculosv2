import { describe, expect, it, vi } from "vitest";
import { getVehicle } from "./getVehicle.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

function createContext(): ServiceContext {
  return {
    actor: { id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    permissions: ["inventory.read"],
    requestId: "req_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

describe("getVehicle", () => {
  it("records audit metadata for vehicle reads", async () => {
    const context = createContext();

    const result = await getVehicle(context, { vehicleId: "vehicle_1" });

    expect(result).toEqual({
      status: "not_implemented",
      vehicleId: "vehicle_1",
    });
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle.get",
        entityId: "vehicle_1",
        requestId: "req_1",
      }),
    );
  });

  it("requires inventory read permission", async () => {
    const context = createContext();
    context.permissions = [];

    await expect(
      getVehicle(context, { vehicleId: "vehicle_1" }),
    ).rejects.toThrow("Missing permission: inventory.read");
  });
});
