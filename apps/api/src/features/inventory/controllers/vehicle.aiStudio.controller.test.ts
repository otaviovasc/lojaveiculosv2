import { describe, expect, it } from "vitest";
import {
  createInventoryTestApp,
  createInventoryTestServices,
} from "./vehicle.controller.testSupport.js";

describe("inventory AI studio routes", () => {
  it("generates an AI studio preview for unit media", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/ai-studio/generations",
      {
        body: JSON.stringify({
          mediaId: "media_1",
          templateId: "premium_studio",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      generatedUrl: "https://cdn.local/output.png",
      model: "flux_2_pro",
      templateId: "premium_studio",
    });
    expect(services.generateAiStudioImage).toHaveBeenCalledWith(
      expect.any(Object),
      {
        mediaId: "media_1",
        templateId: "premium_studio",
        unitId: "unit_1",
      },
    );
  });

  it("approves a generated AI studio image into the gallery", async () => {
    const services = createInventoryTestServices();
    const app = createInventoryTestApp(services);

    const response = await app.request(
      "/api/v1/inventory/units/unit_1/ai-studio/approvals",
      {
        body: JSON.stringify({
          generatedStorageKey:
            "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
          mediaId: "media_1",
          templateId: "premium_studio",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    expect(services.approveAiStudioImage).toHaveBeenCalledWith(
      expect.any(Object),
      {
        generatedStorageKey:
          "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
        mediaId: "media_1",
        templateId: "premium_studio",
        unitId: "unit_1",
      },
    );
  });
});
