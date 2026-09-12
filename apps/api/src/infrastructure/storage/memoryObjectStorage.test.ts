import { describe, expect, it } from "vitest";
import { createMemoryObjectStorage } from "./memoryObjectStorage.js";

describe("createMemoryObjectStorage", () => {
  it("prefixes newly stored keys with the local environment", async () => {
    const storage = createMemoryObjectStorage();
    const input = {
      contentType: "application/pdf",
      fileName: "receipt.pdf",
      scopeSegments: ["tenants", "tenant_1", "stores", "store_1"],
      sizeBytes: 128,
    };

    const upload = await storage.createUpload(input);
    const stored = await storage.putObject({
      body: new Uint8Array([1]),
      ...input,
    });

    expect(upload.storageKey).toBe(
      "l/tenants/tenant_1/stores/store_1/receipt.pdf",
    );
    expect(upload.uploadUrl).toBe(
      "https://upload.local/l/tenants/tenant_1/stores/store_1/receipt.pdf",
    );
    expect(stored.storageKey).toBe(
      "l/tenants/tenant_1/stores/store_1/receipt.pdf",
    );
  });
});
