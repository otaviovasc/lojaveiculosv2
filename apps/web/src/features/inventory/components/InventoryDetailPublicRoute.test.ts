import { describe, expect, it } from "vitest";
import { listingDetailPayload } from "../api/apiClientTestSupport";
import type { InventoryListingDetail } from "../model/types";
import { buildPublicListingUrl } from "./InventoryDetailPublicRoute";

describe("inventory detail public route", () => {
  it("builds a public storefront listing URL from the matched store slug", () => {
    const detail = detailWithListing({
      publicSlug: "fiat-toro-volcano",
      status: "published",
      storeId: "store_2",
    });

    expect(
      buildPublicListingUrl(detail, [
        { id: "store_1", slug: "matriz" },
        { id: "store_2", slug: "filial centro" },
      ]),
    ).toBe("/filial%20centro?listing=fiat-toro-volcano");
  });

  it("falls back to the only store when the listing store is not in session", () => {
    const detail = detailWithListing({
      publicSlug: "civic-touring",
      status: "published",
      storeId: "store_missing",
    });

    expect(
      buildPublicListingUrl(detail, [{ id: "store_1", slug: "matriz" }]),
    ).toBe("/matriz?listing=civic-touring");
  });

  it("does not expose a public route for unpublished or ambiguous listings", () => {
    expect(
      buildPublicListingUrl(
        detailWithListing({ publicSlug: "draft-car", status: "draft" }),
        [{ id: "store_1", slug: "matriz" }],
      ),
    ).toBeNull();
    expect(
      buildPublicListingUrl(
        detailWithListing({
          publicSlug: "unknown-store",
          status: "published",
          storeId: "store_missing",
        }),
        [
          { id: "store_1", slug: "matriz" },
          { id: "store_2", slug: "filial" },
        ],
      ),
    ).toBeNull();
  });
});

function detailWithListing(
  listing: Partial<InventoryListingDetail["listing"]>,
): InventoryListingDetail {
  const detail = {
    ...listingDetailPayload(),
    documents: [],
  } as unknown as InventoryListingDetail;
  return {
    ...detail,
    listing: {
      ...detail.listing,
      ...listing,
    },
  };
}
