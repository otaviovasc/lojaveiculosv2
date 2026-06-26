import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import { retryInventoryCreateMedia } from "./createInventorySubmit";
import type { CreateMediaDraft } from "./createMediaDrafts";
import type { InventoryListingDetail } from "./types";

describe("retryInventoryCreateMedia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not skip retry media for another unit with the same file metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null)),
    );
    const media = [
      { ...mediaDraft("front.jpg"), id: "draft_1", unitDraftId: "0" },
      { ...mediaDraft("front.jpg"), id: "draft_2", unitDraftId: "1" },
    ];
    const detail = listingDetail();
    const api = createApi(detail);

    await retryInventoryCreateMedia({
      api,
      listingId: "listing_1",
      media,
      onProgress: vi.fn(),
    });

    expect(api.requestMediaUpload).toHaveBeenCalledTimes(1);
    expect(api.requestMediaUpload).toHaveBeenCalledWith(
      "unit_2",
      expect.objectContaining({ kind: "photo" }),
    );
    expect(api.createMedia).toHaveBeenCalledWith(
      "unit_2",
      expect.objectContaining({ displayOrder: 0 }),
    );
  });
});

function createApi(detail: InventoryListingDetail): InventoryApi {
  const upload = {
    expiresAt: "2026-01-01T00:15:00.000Z",
    publicUrl: "https://cdn.local/front.jpg",
    storageKey: "tenants/t/stores/s/units/unit_2/photo/front.jpg",
    uploadHeaders: { "content-type": "image/jpeg" },
    uploadMethod: "PUT" as const,
    uploadUrl: "https://upload.local/front.jpg",
  };

  return {
    createMedia: vi.fn(async () => ({
      mediaId: "media_2",
      status: "created" as const,
      unitId: "unit_2",
      url: upload.publicUrl,
    })),
    getListing: vi.fn(async () => detail),
    requestMediaUpload: vi.fn(async () => upload),
  } as unknown as InventoryApi;
}

function mediaDraft(name: string): CreateMediaDraft {
  return {
    altText: name,
    displayOrder: 0,
    file: new File(["image-bytes"], name, { type: "image/jpeg" }),
    id: `draft_${name}`,
    kind: "photo",
    previewUrl: null,
  };
}

function listingDetail(): InventoryListingDetail {
  return {
    checklists: [],
    costs: [],
    documents: [],
    listing: {
      catalog: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      doors: null,
      engineAspiration: null,
      engineDisplacement: null,
      fuelType: null,
      id: "listing_1",
      internalNotes: null,
      manufactureYear: null,
      mileageKm: null,
      modelYear: null,
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "draft",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Inventory title",
      transmission: null,
      trimName: null,
      unitIds: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    media: [
      {
        altText: "front.jpg",
        createdAt: "2026-01-01T00:00:00.000Z",
        displayOrder: 0,
        id: "media_1",
        isPublic: true,
        kind: "photo",
        storageKey: "tenants/t/stores/s/units/unit_1/photo/front.jpg",
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId: "unit_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        url: "https://cdn.local/front.jpg",
      },
    ],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: [unit("unit_1"), unit("unit_2")],
  };
}

function unit(id: string): InventoryListingDetail["units"][number] {
  return {
    colorName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available",
    stockNumber: null,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: null,
  };
}
