import { describe, expect, it } from "vitest";
import { createR2ObjectStorage } from "./r2ObjectStorage.js";

describe("R2 presigned browser uploads", () => {
  it("does not bind an empty CRC32 checksum to the upload URL", async () => {
    const storage = createR2ObjectStorage({
      accessKeyId: "key",
      bucketName: "app-media",
      endpoint: "https://account.r2.cloudflarestorage.com",
      environmentPrefix: "s",
      publicBaseUrl: "https://media.lojaveiculos.com.br",
      secretAccessKey: "secret",
      uniqueId: () => "uuid_1",
    });

    try {
      const upload = await storage.createUpload({
        contentType: "image/png",
        fileName: "vehicle.png",
        scopeSegments: ["tenants", "tenant_1", "media"],
        sizeBytes: 1024,
      });
      const uploadUrl = new URL(upload.uploadUrl);

      expect(uploadUrl.searchParams.has("x-amz-checksum-crc32")).toBe(false);
      expect(uploadUrl.searchParams.has("x-amz-sdk-checksum-algorithm")).toBe(
        false,
      );
    } finally {
      await storage.close?.();
    }
  });
});
