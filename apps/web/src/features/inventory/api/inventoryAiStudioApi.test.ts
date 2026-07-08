import { describe, expect, it } from "vitest";
import { createInventoryApi } from "./apiClient";
import {
  bodyOf,
  callAt,
  createFakeFetch,
  listingDetailPayload,
} from "./apiClientTestSupport";

describe("inventory AI studio API", () => {
  it("generates and approves AI studio images through inventory routes", async () => {
    const fake = createFakeFetch([
      {
        beforeUrl: "https://cdn.local/front.jpg",
        credits: 4,
        generatedStorageKey:
          "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
        generatedUrl: "https://cdn.local/output.png",
        guidance: 0.75,
        mediaId: "media_1",
        model: "flux_2_pro",
        sourceStorageKey:
          "tenants/tenant_1/stores/store_1/units/unit_1/photo/front.jpg",
        strength: 0.75,
        templateId: "premium_studio",
        unitId: "unit_1",
      },
      listingDetailPayload(),
    ]);
    const api = createInventoryApi({ fetch: fake.fetch });

    await api.generateAiStudioImage("unit_1", {
      mediaId: "media_1",
      templateId: "premium_studio",
    });
    await api.approveAiStudioImage("unit_1", {
      generatedStorageKey:
        "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
      mediaId: "media_1",
      templateId: "premium_studio",
    });

    expect(callAt(fake.calls, 0).input).toBe(
      "/api/v1/inventory/units/unit_1/ai-studio/generations",
    );
    expect(bodyOf(callAt(fake.calls, 0))).toEqual({
      mediaId: "media_1",
      templateId: "premium_studio",
    });
    expect(callAt(fake.calls, 1).input).toBe(
      "/api/v1/inventory/units/unit_1/ai-studio/approvals",
    );
    expect(bodyOf(callAt(fake.calls, 1))).toEqual({
      generatedStorageKey:
        "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
      mediaId: "media_1",
      templateId: "premium_studio",
    });
  });
});
