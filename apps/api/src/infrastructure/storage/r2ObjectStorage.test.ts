import { describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  createR2ObjectStorage,
  createR2ObjectStorageFromEnv,
  R2ObjectStorageConfigError,
  type R2UrlSigner,
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
      }),
    ).toThrow(R2ObjectStorageConfigError);
    expect(() =>
      createR2ObjectStorageFromEnv({
        R2_BUCKET_NAME: "bucket",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      }),
    ).toThrow(R2ObjectStorageConfigError);
  });

  it("creates private signed download urls with a 300 second env default", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const signer: R2UrlSigner = vi.fn(async (_client, command) => {
      expect(command).toBeInstanceOf(GetObjectCommand);
      return "https://signed-download.example/document.pdf";
    });
    const storage = createR2ObjectStorageFromEnv({
      R2_ACCESS_KEY_ID: "key",
      R2_BUCKET_NAME: "app-media",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_PUBLIC_BASE_URL: "https://media.lojaveiculos.com.br",
      R2_SECRET_ACCESS_KEY: "secret",
    });
    const directStorage = createR2ObjectStorage({
      accessKeyId: "key",
      bucketName: "app-media",
      endpoint: "https://account.r2.cloudflarestorage.com",
      publicBaseUrl: "https://media.lojaveiculos.com.br",
      secretAccessKey: "secret",
      signer,
    });

    expect(storage).not.toBeNull();
    const download = await directStorage.createDownload({
      fileName: "Contrato.pdf",
      mimeType: "application/pdf",
      storageKey: "private/document.pdf",
    });

    expect(download).toEqual({
      downloadMethod: "GET",
      downloadUrl: "https://signed-download.example/document.pdf",
      expiresAt: new Date("2026-01-01T00:05:00.000Z"),
    });
    vi.useRealTimers();
  });

  it("deletes objects by storage key", async () => {
    const objectDeleter = vi.fn(async (_client, command) => {
      expect(command).toBeInstanceOf(DeleteObjectCommand);
    });
    const storage = createR2ObjectStorage({
      accessKeyId: "key",
      bucketName: "app-media",
      endpoint: "https://account.r2.cloudflarestorage.com",
      objectDeleter,
      publicBaseUrl: "https://media.lojaveiculos.com.br",
      secretAccessKey: "secret",
    });

    await storage.deleteObject?.({ storageKey: "media/front.jpg" });

    expect(objectDeleter).toHaveBeenCalledOnce();
  });
});
