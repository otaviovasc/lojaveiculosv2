import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import {
  retryInventoryCreateMedia,
  submitInventoryCreateFlow,
} from "./createInventorySubmit";
import type { CreateMediaDraft } from "./createMediaDrafts";
import { createInitialInventoryForm } from "./formModel";
import type { InventoryListingDetail } from "./types";

describe("inventory create submit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a saved-record state when media attach fails after create", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null)),
    );
    const media = [createMediaDraft("front.jpg")];
    const api = createSubmitApi({
      createMedia: vi.fn(async () => {
        throw new Error("attach failed");
      }),
    });

    const result = await submitInventoryCreateFlow({
      api,
      form: createForm(),
      media,
      onProgress: vi.fn(),
    });

    expect(result).toMatchObject({
      failedStep: "media",
      failedMediaIds: [media[0]?.id],
      kind: "saved_with_media_failure",
      listingId: "listing_1",
      mediaCount: 1,
    });
    expect(api.createListing).toHaveBeenCalledTimes(1);
    expect(api.attachUnit).toHaveBeenCalledTimes(1);
    expect(api.createFlow).not.toHaveBeenCalled();
    expect(api.requestMediaUpload).toHaveBeenCalledTimes(1);
  });

  it("returns a saved-record state when unit attach fails after create", async () => {
    const media = [createMediaDraft("front.jpg")];
    const api = createSubmitApi({
      attachUnit: vi.fn(async () => {
        throw new Error("unit failed");
      }),
    });

    const result = await submitInventoryCreateFlow({
      api,
      form: createForm(),
      media,
      onProgress: vi.fn(),
    });

    expect(result).toMatchObject({
      failedMediaIds: [media[0]?.id],
      failedStep: "unit",
      kind: "saved_with_media_failure",
      listingId: "listing_1",
    });
    expect(api.createListing).toHaveBeenCalledTimes(1);
    expect(api.attachUnit).toHaveBeenCalledTimes(1);
    expect(api.createFlow).not.toHaveBeenCalled();
    expect(api.requestMediaUpload).not.toHaveBeenCalled();
  });

  it("retries unit and media against the saved listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null)),
    );
    const media = [createMediaDraft("front.jpg")];
    const api = createSubmitApi();

    const result = await retryInventoryCreateMedia({
      api,
      form: createForm(),
      listingId: "listing_1",
      media,
      onProgress: vi.fn(),
    });

    expect(result.kind).toBe("complete");
    expect(api.createFlow).not.toHaveBeenCalled();
    expect(api.createListing).not.toHaveBeenCalled();
    expect(api.attachUnit).toHaveBeenCalledTimes(1);
    expect(api.requestMediaUpload).toHaveBeenCalledTimes(1);
    expect(api.createMedia).toHaveBeenCalledTimes(1);
  });

  it("retries media against the saved listing without recreating attached media", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null)),
    );
    const media = [createMediaDraft("front.jpg")];
    const detail = listingDetail({
      media: [
        {
          altText: "front.jpg",
          createdAt: "2026-01-01T00:00:00.000Z",
          displayOrder: 0,
          id: "media_1",
          isPublic: true,
          kind: "photo",
          listingId: "listing_1",
          storageKey: "tenants/t/stores/s/listings/listing_1/photo/front.jpg",
          storeId: "store_1",
          tenantId: "tenant_1",
          updatedAt: "2026-01-01T00:00:00.000Z",
          url: "https://cdn.local/front.jpg",
        },
      ],
      units: [unitRecord()],
    });
    const api = createSubmitApi({
      getListing: vi.fn(async () => detail),
    });

    const result = await retryInventoryCreateMedia({
      api,
      form: createForm(),
      listingId: "listing_1",
      media,
      onProgress: vi.fn(),
    });

    expect(result.kind).toBe("complete");
    expect(result.detail.media).toHaveLength(1);
    expect(api.createFlow).not.toHaveBeenCalled();
    expect(api.createListing).not.toHaveBeenCalled();
    expect(api.attachUnit).not.toHaveBeenCalled();
    expect(api.requestMediaUpload).not.toHaveBeenCalled();
    expect(api.createMedia).not.toHaveBeenCalled();
  });
});

function createForm() {
  return {
    ...createInitialInventoryForm(),
    status: "draft" as const,
    title: "Inventory title",
  };
}

function createMediaDraft(name: string): CreateMediaDraft {
  return {
    altText: name,
    displayOrder: 0,
    file: new File(["image-bytes"], name, { type: "image/jpeg" }),
    id: `draft_${name}`,
    kind: "photo",
    previewUrl: null,
  };
}

function createSubmitApi(overrides: Partial<InventoryApi> = {}): InventoryApi {
  const upload = {
    expiresAt: "2026-01-01T00:15:00.000Z",
    publicUrl: "https://cdn.local/front.jpg",
    storageKey: "tenants/t/stores/s/listings/listing_1/photo/front.jpg",
    uploadHeaders: { "content-type": "image/jpeg" },
    uploadMethod: "PUT" as const,
    uploadUrl: "https://upload.local/front.jpg",
  };

  return {
    attachUnit: vi.fn(async () => listingDetail({ units: [unitRecord()] })),
    createFlow: vi.fn(),
    createListing: vi.fn(async () => listingDetail()),
    createMedia: vi.fn(async () => ({
      listingId: "listing_1",
      mediaId: "media_1",
      status: "created" as const,
      storageKey: upload.storageKey,
      url: upload.publicUrl,
    })),
    getListing: vi.fn(async () => listingDetail()),
    requestMediaUpload: vi.fn(async () => upload),
    ...overrides,
  } as unknown as InventoryApi;
}

function listingDetail(
  overrides: Partial<InventoryListingDetail> = {},
): InventoryListingDetail {
  return {
    costs: [],
    documents: [],
    listing: {
      catalog: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      id: "listing_1",
      manufactureYear: null,
      modelYear: null,
      plate: "ABC1D23",
      priceCents: 12000000,
      status: "draft",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Inventory title",
      trimName: null,
      unitIds: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    media: [],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: [],
    ...overrides,
  };
}

function unitRecord(): InventoryListingDetail["units"][number] {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "unit_1",
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
