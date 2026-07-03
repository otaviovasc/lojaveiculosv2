import { describe, expect, it } from "vitest";
import { createRuntimeObjectStorage } from "./runtimeObjectStorage.js";

describe("createRuntimeObjectStorage", () => {
  it("uses memory storage for local DB-backed development without R2", async () => {
    const storage = createRuntimeObjectStorage({ APP_ENV: "local" });

    expect(storage).not.toBeNull();
    const upload = await storage?.createUpload({
      contentType: "application/pdf",
      fileName: "receipt.pdf",
      scopeSegments: ["tenants", "tenant_1", "stores", "store_1"],
      sizeBytes: 128,
    });

    expect(upload?.uploadUrl).toBe(
      "https://upload.local/tenants/tenant_1/stores/store_1/receipt.pdf",
    );
    expect(storage?.getPublicUrl("documents/receipt.pdf")).toBe(
      "https://cdn.local/documents/receipt.pdf",
    );
  });

  it("does not create memory storage for production without R2", () => {
    expect(
      createRuntimeObjectStorage({
        APP_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBeNull();
  });
});
