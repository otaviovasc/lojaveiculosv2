import { describe, expect, it, vi } from "vitest";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { StorefrontPageServices } from "./storefrontPageServices.js";
import { createStorefrontPagesFeature } from "./storefrontPages.controller.js";

describe("storefront vehicle Vitrine controller", () => {
  it("rejects malformed listing ids before invoking the command", async () => {
    const services = createServices();
    const feature = createStorefrontPagesFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: ["inventory.read", "store_public_site.manage"],
          request: { requestId: "req_1" },
          storeId: "store_1" as never,
          tenantId: "tenant_1" as never,
        }),
      services,
    });

    const response = await feature.request(
      "/pages/vehicle-vitrine/not-a-uuid",
      {
        body: JSON.stringify({ visible: true }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "STOREFRONT_PAGES_REQUEST_ERROR",
    });
    expect(services.createOrReuseVehicleVitrine).not.toHaveBeenCalled();
  });
});

const page: StorefrontCustomPage = {
  components: [],
  id: "page_1",
  order: 0,
  slug: "vitrine",
  title: "Vitrine",
  visible: true,
};

function createServices(): StorefrontPageServices {
  return {
    createOrReuseVehicleVitrine: vi.fn(async () => page),
    createPage: vi.fn(async () => page),
    deletePage: vi.fn(async () => ({ deleted: false })),
    getPage: vi.fn(async () => page),
    listPages: vi.fn(async () => []),
    updatePage: vi.fn(async () => page),
  };
}
