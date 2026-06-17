import { describe, expect, it, vi } from "vitest";
import { createVehicle } from "./createVehicle.js";
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
    permissions: ["inventory.create"],
    requestId: "req_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

describe("createVehicle", () => {
  it("requires inventory create permission", async () => {
    const context = createContext();
    context.permissions = [];

    await expect(
      createVehicle(context, { plate: null, title: "Vehicle" }),
    ).rejects.toThrow("Missing permission: inventory.create");
  });

  it("records audit metadata for vehicle creation", async () => {
    const context = createContext();

    const result = await createVehicle(context, {
      plate: "ABC1D23",
      title: "Vehicle",
    });

    expect(result.status).toBe("not_implemented");
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle.create",
        entityType: "vehicle",
        requestId: "req_1",
      }),
    );
  });
});
