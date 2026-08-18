import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmRemoteMediaFetcher } from "../ports/crmRemoteMediaFetcher.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import {
  mirrorNewZapiProfilePhoto,
  mirrorZapiProfilePhoto,
  type MirrorZapiProfilePhotoInput,
} from "./mirrorZapiProfilePhoto.js";

describe("mirrorZapiProfilePhoto", () => {
  it("stores a bounded remote image under the scoped CRM profile path", async () => {
    const fetchMedia = vi.fn(async () => ({
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg; charset=binary",
      finalUrl: "https://zapi.test/profile.jpg",
    }));
    const putObject = vi.fn(
      async (_input: Parameters<ObjectStorage["putObject"]>[0]) => ({
        publicUrl: "https://cdn.local/profile.jpg",
        storageKey: "test/crm/profile.jpg",
      }),
    );

    await expect(
      mirrorZapiProfilePhoto(profileInput(fetchMedia, putObject)),
    ).resolves.toEqual({
      profilePhotoUrl: "https://cdn.local/profile.jpg",
      status: "stored",
      storageKey: "test/crm/profile.jpg",
    });
    expect(fetchMedia).toHaveBeenCalledWith({
      maxBytes: 5 * 1024 * 1024,
      url: "https://zapi.test/profile.jpg",
    });
    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
        fileName: "profile.jpg",
      }),
    );
    const scope = putObject.mock.calls[0]?.[0].scopeSegments;
    expect(scope).toEqual(
      expect.arrayContaining([
        "crm",
        "whatsapp",
        "tenant-1",
        "store-1",
        "connection-1",
        "profiles",
      ]),
    );
    expect(scope?.at(-1)).toMatch(/^[a-f0-9]{32}$/);
    expect(scope).not.toContain("5511999999999");
  });

  it("does not store non-image content returned by the provider URL", async () => {
    const fetchMedia = vi.fn(async () => ({
      body: new Uint8Array([1]),
      contentType: "text/html",
      finalUrl: "https://zapi.test/profile.jpg",
    }));
    const putObject = vi.fn<ObjectStorage["putObject"]>();

    await expect(
      mirrorZapiProfilePhoto(profileInput(fetchMedia, putObject)),
    ).resolves.toEqual({
      errorName: "UnsupportedProfilePhotoContentType",
      status: "failed",
    });
    expect(putObject).not.toHaveBeenCalled();
  });

  it("falls back to the authenticated provider URL when the webhook URL expired", async () => {
    const fetchMedia = vi
      .fn<CrmRemoteMediaFetcher["fetchMedia"]>()
      .mockRejectedValueOnce(new Error("expired temporary URL"))
      .mockResolvedValueOnce({
        body: new Uint8Array([4, 5, 6]),
        contentType: "image/png",
        finalUrl: "https://zapi.test/current-profile.png",
      });
    const putObject = vi.fn(
      async (_input: Parameters<ObjectStorage["putObject"]>[0]) => ({
        publicUrl: "https://cdn.local/current-profile.png",
        storageKey: "test/crm/current-profile.png",
      }),
    );
    const repository = {
      findConversationCycleByIdentity: vi.fn(async () => null),
    } as never;

    await expect(
      mirrorNewZapiProfilePhoto({
        ...profileInput(fetchMedia, putObject),
        customerPhone: "5511999999999",
        repository,
        resolvePhotoUrl: async () => "https://zapi.test/current-profile.png",
      }),
    ).resolves.toMatchObject({ status: "stored" });
    expect(fetchMedia).toHaveBeenNthCalledWith(2, {
      maxBytes: 5 * 1024 * 1024,
      url: "https://zapi.test/current-profile.png",
    });
  });
});

function profileInput(
  fetchMedia: CrmRemoteMediaFetcher["fetchMedia"],
  putObject: ObjectStorage["putObject"],
): MirrorZapiProfilePhotoInput {
  return {
    connectionId: "connection-1",
    contactIdentity: "5511999999999",
    photoUrl: "https://zapi.test/profile.jpg",
    remoteMediaFetcher: {
      fetchMedia,
      validateUrl: vi.fn(async () => undefined),
    },
    storage: {
      createDownload: vi.fn(),
      createUpload: vi.fn(),
      getPublicUrl: vi.fn(),
      putObject,
    },
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
  };
}
