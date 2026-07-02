import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  createStorefrontMediaFeature,
  type StorefrontMediaContextFactory,
} from "./storefrontMedia.controller.js";
import type { StorefrontMediaServices } from "./storefrontMediaServices.js";

describe("storefront media routes", () => {
  it("lists the store media library", async () => {
    const services = createServices();
    const app = createTestApp(services);

    const response = await app.request("/api/v1/storefront/media");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      assets: [assetResponse],
    });
    expect(services.listAssets).toHaveBeenCalledWith(expect.any(Object));
  });

  it("requests a storefront image upload", async () => {
    const services = createServices();
    const app = createTestApp(services);

    const response = await app.request("/api/v1/storefront/media/uploads", {
      body: JSON.stringify({
        contentType: "image/png",
        fileName: "fachada.png",
        height: 900,
        sizeBytes: 2048,
        width: 1600,
      }),
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(uploadResponse);
    expect(services.requestUpload).toHaveBeenCalledWith(expect.any(Object), {
      contentType: "image/png",
      fileName: "fachada.png",
      height: 900,
      sizeBytes: 2048,
      width: 1600,
    });
  });

  it("rejects invalid upload bodies", async () => {
    const app = createTestApp(createServices());

    const response = await app.request("/api/v1/storefront/media/uploads", {
      body: JSON.stringify({ contentType: "", fileName: "", sizeBytes: 0 }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "STOREFRONT_MEDIA_REQUEST_ERROR",
      message: "Request body is invalid.",
    });
  });
});

function createTestApp(
  services: StorefrontMediaServices,
  contextFactory: StorefrontMediaContextFactory = createUserContext,
) {
  const app = new Hono();
  app.route(
    "/api/v1/storefront",
    createStorefrontMediaFeature({ contextFactory, services }),
  );
  return app;
}

function createServices(): StorefrontMediaServices {
  return {
    listAssets: vi.fn(async () => [assetResponse]),
    requestUpload: vi.fn(async () => uploadResponse),
  };
}

async function createUserContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["store_public_site.manage"],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

const assetResponse = {
  contentType: "image/png",
  createdAt: "2026-01-01T00:00:00.000Z",
  fileName: "fachada.png",
  height: 900,
  id: "media_1",
  kind: "image" as const,
  publicUrl: "https://cdn.local/fachada.png",
  sizeBytes: 2048,
  storageKey: "tenants/tenant_1/stores/store_1/storefront/media/fachada.png",
  updatedAt: "2026-01-01T00:00:00.000Z",
  width: 1600,
};

const uploadResponse = {
  asset: assetResponse,
  expiresAt: "2026-01-01T00:15:00.000Z",
  publicUrl: assetResponse.publicUrl,
  storageKey: assetResponse.storageKey,
  uploadHeaders: { "content-type": "image/png" },
  uploadMethod: "PUT" as const,
  uploadUrl: "https://upload.local/fachada.png",
};
