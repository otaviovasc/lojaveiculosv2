import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { StorefrontMediaRepository } from "../../ports/storefrontMediaRepository.js";
import { completeStorefrontMediaUpload } from "./completeStorefrontMediaUpload.js";
import { requestStorefrontMediaUpload } from "./requestStorefrontMediaUpload.js";

describe("requestStorefrontMediaUpload", () => {
  it("creates audited R2-backed storefront upload instructions", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const audit = { record: vi.fn(async () => undefined) };
    const context = createContext(audit);

    const result = await requestStorefrontMediaUpload(
      context,
      {
        contentType: "image/png",
        fileName: "fachada.png",
        height: 900,
        sizeBytes: 2048,
        width: 1600,
      },
      { storage },
    );

    expect(storage.createUpload).toHaveBeenCalledWith({
      contentType: "image/png",
      fileName: "fachada.png",
      scopeSegments: [
        "tenants",
        "tenant_1",
        "stores",
        "store_1",
        "storefront",
        "media",
      ],
      sizeBytes: 2048,
    });
    expect(repository.createAsset).not.toHaveBeenCalled();
    expect(result.storageKey).toBe(
      "tenants/tenant_1/stores/store_1/storefront/media/fachada.png",
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "storefront_media.upload.request",
        entityId:
          "tenants/tenant_1/stores/store_1/storefront/media/fachada.png",
      }),
    );
  });

  it("rejects non-image uploads", async () => {
    await expect(
      requestStorefrontMediaUpload(
        createContext(),
        {
          contentType: "application/pdf",
          fileName: "doc.pdf",
          sizeBytes: 120,
        },
        { storage: createStorage() },
      ),
    ).rejects.toThrow("Storefront media uploads must be images.");
  });
});

describe("completeStorefrontMediaUpload", () => {
  it("creates an audited storefront media asset after object upload", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const audit = { record: vi.fn(async () => undefined) };

    const result = await completeStorefrontMediaUpload(
      createContext(audit),
      {
        contentType: "image/png",
        fileName: "fachada.png",
        height: 900,
        sizeBytes: 2048,
        storageKey:
          "tenants/tenant_1/stores/store_1/storefront/media/fachada.png",
        width: 1600,
      },
      { repository, storage },
    );

    expect(repository.createAsset).toHaveBeenCalledWith(
      { storeId: "store_1", tenantId: "tenant_1" },
      expect.objectContaining({
        fileName: "fachada.png",
        publicUrl: "https://cdn.local/fachada.png",
        storageKey:
          "tenants/tenant_1/stores/store_1/storefront/media/fachada.png",
      }),
    );
    expect(result.id).toBe("media_1");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "storefront_media.upload.complete",
        entityId: "media_1",
      }),
    );
  });

  it("rejects storage keys from another storefront scope", async () => {
    await expect(
      completeStorefrontMediaUpload(
        createContext(),
        {
          contentType: "image/png",
          fileName: "fachada.png",
          sizeBytes: 2048,
          storageKey:
            "tenants/tenant_2/stores/store_2/storefront/media/fachada.png",
        },
        { repository: createRepository(), storage: createStorage() },
      ),
    ).rejects.toThrow("Storefront media storage key does not belong");
  });
});

function createContext(audit = { record: vi.fn(async () => undefined) }) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit,
    permissions: ["store_public_site.manage"],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createStorage(): ObjectStorage {
  return {
    createDownload: vi.fn(),
    createUpload: vi.fn(async () => ({
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
      publicUrl: "https://cdn.local/fachada.png",
      storageKey:
        "tenants/tenant_1/stores/store_1/storefront/media/fachada.png",
      uploadHeaders: { "content-type": "image/png" },
      uploadMethod: "PUT" as const,
      uploadUrl: "https://upload.local/fachada.png",
    })),
    getPublicUrl: vi.fn(() => "https://cdn.local/fachada.png"),
    putObject: vi.fn(),
  };
}

function createRepository(): StorefrontMediaRepository {
  return {
    createAsset: vi.fn<StorefrontMediaRepository["createAsset"]>(
      async (_scope, input) => ({
        contentType: input.contentType,
        createdAt: "2026-01-01T00:00:00.000Z",
        fileName: input.fileName,
        height: input.height ?? null,
        id: "media_1",
        kind: input.kind,
        publicUrl: input.publicUrl,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        updatedAt: "2026-01-01T00:00:00.000Z",
        width: input.width ?? null,
      }),
    ),
    listAssets: vi.fn(async () => []),
  };
}
