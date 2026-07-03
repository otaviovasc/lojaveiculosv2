import { describe, expect, it } from "vitest";
import { createStorefrontMediaApi } from "./storefrontMediaApi";

type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

describe("createStorefrontMediaApi", () => {
  it("lists storefront media assets", async () => {
    const calls: FetchCall[] = [];
    const api = createStorefrontMediaApi({
      fetch: async (input, init) => {
        calls.push({ init, input });
        return jsonResponse({ assets: [asset] });
      },
    });

    const result = await api.listAssets();

    expect(result).toEqual([asset]);
    expect(calls[0]).toMatchObject({
      input: "/api/v1/storefront/media",
    });
  });

  it("requests a R2 upload and sends the edited blob", async () => {
    const calls: FetchCall[] = [];
    const api = createStorefrontMediaApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "demo" },
      fetch: async (input, init) => {
        calls.push({ init, input });
        if (String(input).includes("/uploads/complete")) {
          return jsonResponse({ asset });
        }
        if (String(input).includes("/uploads")) return jsonResponse(upload);
        return new Response(null, { status: 200 });
      },
    });
    const blob = new Blob(["png"], { type: "image/png" });

    const result = await api.uploadImage({
      blob,
      fileName: "fachada.png",
      height: 900,
      width: 1600,
    });

    expect(result).toEqual(asset);
    expect(calls[0]).toMatchObject({
      input: "/api/v1/storefront/media/uploads",
      init: {
        body: JSON.stringify({
          contentType: "image/png",
          fileName: "fachada.png",
          height: 900,
          sizeBytes: blob.size,
          width: 1600,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-clerk-user-id": "clerk_1",
          "x-store-slug": "demo",
        },
        method: "POST",
      },
    });
    expect(calls[1]).toMatchObject({
      input: "https://storage.example/fachada.png",
      init: {
        body: blob,
        headers: { "content-type": "image/png" },
        method: "PUT",
      },
    });
    expect(calls[2]).toMatchObject({
      input: "/api/v1/storefront/media/uploads/complete",
      init: {
        body: JSON.stringify({
          contentType: "image/png",
          fileName: "fachada.png",
          height: 900,
          sizeBytes: blob.size,
          storageKey: asset.storageKey,
          width: 1600,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-clerk-user-id": "clerk_1",
          "x-store-slug": "demo",
        },
        method: "POST",
      },
    });
  });

  it("skips local mock object uploads before registering the asset", async () => {
    const calls: FetchCall[] = [];
    const api = createStorefrontMediaApi({
      fetch: async (input, init) => {
        calls.push({ init, input });
        if (String(input).includes("/uploads/complete")) {
          return jsonResponse({ asset });
        }
        return jsonResponse({
          ...upload,
          uploadUrl: "https://upload.local/fachada.png",
        });
      },
    });

    await api.uploadImage({
      blob: new Blob(["png"], { type: "image/png" }),
      fileName: "fachada.png",
      height: 900,
      width: 1600,
    });

    expect(calls.map((call) => call.input)).toEqual([
      "/api/v1/storefront/media/uploads",
      "/api/v1/storefront/media/uploads/complete",
    ]);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

const asset = {
  contentType: "image/png",
  createdAt: "2026-01-01T00:00:00.000Z",
  fileName: "fachada.png",
  height: 900,
  id: "media_1",
  kind: "image",
  publicUrl: "https://cdn.local/fachada.png",
  sizeBytes: 3,
  storageKey: "storefront/media/fachada.png",
  updatedAt: "2026-01-01T00:00:00.000Z",
  width: 1600,
};

const upload = {
  expiresAt: "2026-01-01T00:15:00.000Z",
  publicUrl: asset.publicUrl,
  storageKey: asset.storageKey,
  uploadHeaders: { "content-type": "image/png" },
  uploadMethod: "PUT",
  uploadUrl: "https://storage.example/fachada.png",
};
