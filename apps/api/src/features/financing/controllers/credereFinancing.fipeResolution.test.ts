import { describe, expect, it, vi } from "vitest";
import {
  createServices,
  createStoreApp,
} from "./credereFinancing.controller.testSupport.js";

describe("Credere FIPE resolution route", () => {
  it("forwards an exact selection through the store-scoped service", async () => {
    const resolveFipeVehicle = vi.fn(async () => ({
      candidate: {
        fipeCode: "005340-6",
        modelId: "model_1",
        molicarCode: "01906108-0",
        name: "Gol",
      },
      status: "resolved",
    }));
    const response = await createStoreApp(
      createServices({ store: { resolveFipeVehicle } }),
    ).request("/api/v1/financing/credere/vehicle-models/resolve-fipe", {
      body: JSON.stringify({
        fipeCode: "005340-6",
        modelYear: 2023,
        selectedModelId: "model_1",
        selectedMolicarCode: "01906108-0",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(resolveFipeVehicle).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store_1", tenantId: "tenant_1" }),
      {
        fipeCode: "005340-6",
        modelYear: 2023,
        selectedModelId: "model_1",
        selectedMolicarCode: "01906108-0",
      },
    );
  });

  it("rejects a partial or malformed selected model identity", async () => {
    const services = createServices();
    const response = await createStoreApp(services).request(
      "/api/v1/financing/credere/vehicle-models/resolve-fipe",
      {
        body: JSON.stringify({
          fipeCode: "not-fipe",
          modelYear: 2023,
          selectedModelId: "model_1",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(services.store.resolveFipeVehicle).not.toHaveBeenCalled();
  });
});
