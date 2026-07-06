import { describe, expect, it } from "vitest";
import { listingDetailPayload } from "../api/apiClientTestSupport";
import type { InventoryListingDetail } from "../model/types";
import { buildSalesRouteFromInventoryDetail } from "./InventoryDetailSalesRoute";

describe("inventory detail sales route", () => {
  it("builds a sales-page route with selected vehicle context", () => {
    const baseDetail = listingDetailPayload();
    const detail = {
      ...baseDetail,
      documents: [],
      listing: {
        ...baseDetail.listing,
        id: "listing_42",
        priceCents: 12990000,
        publicSlug: null,
        title: "Honda Civic Touring",
      },
      media: [
        media("media_private", "https://cdn.local/private.jpg", false, 1),
        media("media_public", "https://cdn.local/public.jpg", true, 2),
      ],
      units: [
        unit("unit_1", "AAA1A11", null),
        unit("unit_2", "TRD1E23", "EST-42"),
      ],
    } as InventoryListingDetail;

    const route = buildSalesRouteFromInventoryDetail(detail, "unit_2");
    const params = new URLSearchParams(route.split("?")[1]);

    expect(route.startsWith("/sales?")).toBe(true);
    expect(params.get("listingId")).toBe("listing_42");
    expect(params.get("listingTitle")).toBe("Honda Civic Touring");
    expect(params.get("unitId")).toBe("unit_2");
    expect(params.get("unitLabel")).toBe("EST-42");
    expect(params.get("plate")).toBe("TRD1E23");
    expect(params.get("colorName")).toBe("Preto");
    expect(params.get("primaryMediaUrl")).toBe("https://cdn.local/public.jpg");
    expect(params.get("priceCents")).toBe("12990000");
  });
});

function media(
  id: string,
  url: string,
  isPublic: boolean,
  displayOrder: number,
) {
  return {
    altText: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayOrder,
    id,
    isPublic,
    kind: "photo" as const,
    storageKey: id,
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_2",
    updatedAt: "2026-01-01T00:00:00.000Z",
    url,
  };
}

function unit(id: string, plate: string, stockNumber: string | null) {
  return {
    colorName: "black" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    listingId: "listing_42",
    plate,
    status: "available" as const,
    stockNumber,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: null,
  };
}
