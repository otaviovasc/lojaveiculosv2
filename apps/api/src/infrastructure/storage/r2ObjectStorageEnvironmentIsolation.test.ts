import { vi, describe, expect, it } from "vitest";
import { createR2ObjectStorage } from "./r2ObjectStorage.js";

describe("R2 object storage environment isolation", () => {
  it("rejects reads and deletes outside its environment prefix", async () => {
    const objectDeleter = vi.fn(async () => undefined);
    const objectReader = vi.fn(async () => undefined);
    const storage = createR2ObjectStorage({
      accessKeyId: "key",
      bucketName: "app-media",
      endpoint: "https://account.r2.cloudflarestorage.com",
      environmentPrefix: "s",
      objectDeleter,
      objectReader,
      publicBaseUrl: "https://media.lojaveiculos.com.br",
      secretAccessKey: "secret",
    });

    await expect(
      storage.createDownload({
        fileName: "production.pdf",
        mimeType: "application/pdf",
        storageKey: "p/private/production.pdf",
      }),
    ).rejects.toThrow("inside the s/ environment prefix");
    await expect(
      storage.deleteObject?.({ storageKey: "p/media/front.jpg" }),
    ).rejects.toThrow("inside the s/ environment prefix");
    expect(() => storage.getPublicUrl("p/media/front.jpg")).toThrow(
      "inside the s/ environment prefix",
    );
    expect(objectReader).not.toHaveBeenCalled();
    expect(objectDeleter).not.toHaveBeenCalled();
  });
});
