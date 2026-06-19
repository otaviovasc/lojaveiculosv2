import { describe, expect, it, vi } from "vitest";
import {
  createR2ObjectStorage,
  createR2ObjectStorageFromEnv,
  R2ObjectStorageConfigError,
} from "./r2ObjectStorage.js";

describe("R2 object storage", () => {
  it("creates scoped presigned upload instructions", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const signer = vi.fn(async () => "https://upload.example/front.jpg");
    const storage = createR2ObjectStorage({
      accessKeyId: "key",
      bucketName: "app-media",
      endpoint: "https://account.r2.cloudflarestorage.com",
      publicBaseUrl: "https://media.lojaveiculos.com.br/",
      secretAccessKey: "secret",
      signer,
      uniqueId: () => "uuid_1",
      uploadUrlExpiresSeconds: 600,
    });

    const upload = await storage.createUpload({
      contentType: "image/jpeg",
      fileName: "Frente Principal.JPG",
      scopeSegments: [
        "tenants",
        "tenant_1",
        "stores",
        "store_1",
        "listings",
        "listing_1",
        "photo",
      ],
      sizeBytes: 2048,
    });

    expect(upload).toEqual({
      expiresAt: new Date("2026-01-01T00:10:00.000Z"),
      publicUrl:
        "https://media.lojaveiculos.com.br/tenants/tenant_1/stores/store_1/listings/listing_1/photo/1767225600000-uuid_1-frente-principal.jpg",
      storageKey:
        "tenants/tenant_1/stores/store_1/listings/listing_1/photo/1767225600000-uuid_1-frente-principal.jpg",
      uploadHeaders: { "content-type": "image/jpeg" },
      uploadMethod: "PUT",
      uploadUrl: "https://upload.example/front.jpg",
    });
    expect(signer).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("returns null when R2 env is absent and rejects partial config", () => {
    expect(createR2ObjectStorageFromEnv({})).toBeNull();
    expect(() =>
      createR2ObjectStorageFromEnv({
        R2_BUCKET_NAME: "bucket",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      }),
    ).toThrow(R2ObjectStorageConfigError);
  });
});
