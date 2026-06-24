import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory create listing status validation", () => {
  it("rejects workflow-only statuses on create before calling the service", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({
        plate: "ABC1D23",
        status: "reserved",
        title: "Fiat",
      }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(services.createListing).not.toHaveBeenCalled();
  });

  it("rejects unknown statuses on create before calling the service", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request("/api/v1/inventory/listings", {
      body: JSON.stringify({
        plate: "ABC1D23",
        status: "archived",
        title: "Fiat",
      }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(services.createListing).not.toHaveBeenCalled();
  });
});
