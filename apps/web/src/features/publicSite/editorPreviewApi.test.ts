import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../inventory/api/apiTypes";
import { createInventoryDetailFixture } from "../inventory/model/inventoryDetail.testSupport";
import { createInventoryListingSummary } from "../inventory/model/inventoryListingSummary.testSupport";
import type { StoreSettingsSnapshot } from "../settings/types";
import type { PublicStorefrontApi } from "./apiClient";
import { createEditorPreviewStorefrontApi } from "./editorPreviewApi";

const moduleMocks = vi.hoisted(() => ({
  createInventoryApi: vi.fn(),
  createInventoryApiOptions: vi.fn(),
  getStoreSettings: vi.fn(),
}));

vi.mock("../inventory/api/apiClient", () => ({
  createInventoryApi: moduleMocks.createInventoryApi,
}));

vi.mock("../inventory/api/inventoryRuntimeApi", () => ({
  createInventoryApiOptions: moduleMocks.createInventoryApiOptions,
}));

vi.mock("../settings/runtimeSettingsApi", () => ({
  createRuntimeSettingsApi: () => ({
    getStoreSettings: moduleMocks.getStoreSettings,
  }),
}));

afterEach(() => vi.clearAllMocks());

describe("createEditorPreviewStorefrontApi", () => {
  it("opens a listing found after the first 100 inventory rows", async () => {
    const summaries = Array.from({ length: 101 }, (_, index) =>
      createInventoryListingSummary(`listing_${index}`),
    );
    const baseDetail = createInventoryDetailFixture();
    const targetDetail = createInventoryDetailFixture({
      listing: {
        ...baseDetail.listing,
        id: "listing_100",
        publicSlug: "vehicle-100",
      },
    });
    const listListings = vi.fn<InventoryApi["listListings"]>(
      async (input = {}) => {
        const limit = input.limit ?? 100;
        const offset = input.offset ?? 0;
        const items = summaries.slice(offset, offset + limit);
        const nextOffset = offset + items.length;
        const hasMore = nextOffset < summaries.length;
        return {
          hasMore,
          items,
          nextOffset: hasMore ? nextOffset : null,
          total: summaries.length,
        };
      },
    );
    const getListing = vi.fn<InventoryApi["getListing"]>(
      async () => targetDetail,
    );
    moduleMocks.createInventoryApi.mockReturnValue({
      getListing,
      listListings,
    });
    moduleMocks.createInventoryApiOptions.mockResolvedValue({});
    moduleMocks.getStoreSettings.mockResolvedValue(settingsSnapshot());

    const previewApi = createEditorPreviewStorefrontApi(publicApiStub());
    const result = await previewApi.getListing("listing_100");

    expect(result.listing.slug).toBe("vehicle-100");
    expect(listListings).toHaveBeenNthCalledWith(1, {
      limit: 100,
      offset: 0,
    });
    expect(listListings).toHaveBeenNthCalledWith(2, {
      limit: 100,
      offset: 100,
    });
    expect(getListing).toHaveBeenCalledWith("listing_100");
  });
});

function publicApiStub(): PublicStorefrontApi {
  return {
    getCustomPage: vi.fn(),
    getListing: vi.fn(),
    getSettings: vi.fn(),
    listListings: vi.fn(),
    submitListingInterest: vi.fn(),
  };
}

function settingsSnapshot(): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: "Loja Ltda",
      primaryDomain: null,
      publicSlug: "demo",
      tradingName: "Loja Demo",
    },
    profile: {
      addressCity: null,
      addressLine1: null,
      addressLine2: null,
      addressState: null,
      addressZipCode: null,
      businessHours: {},
      contactEmail: null,
      contactPhone: null,
      documentNumber: null,
      logoImageUrl: null,
      whatsappPhone: null,
    },
    publicSite: {
      customDomain: null,
      customDomainStatus: "not_configured",
      heroImageUrl: null,
      isPublished: true,
      layoutKey: "quadra",
      seoDescription: null,
      seoTitle: null,
      theme: {},
      verificationToken: null,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
