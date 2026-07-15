import type { InventoryListingDetail } from "./types";

export function createInventoryDetailFixture(
  overrides: Partial<InventoryListingDetail> = {},
): InventoryListingDetail {
  const detail: InventoryListingDetail = {
    checklists: [],
    costs: [],
    documents: [],
    listing: {
      catalog: null,
      commercialTags: [],
      createdAt: "2026-01-01T12:00:00.000Z",
      description: "Descrição persistida",
      doors: 4,
      engineAspiration: "aspirated",
      engineDisplacement: "2.0",
      fuelType: "flex",
      id: "listing_1",
      internalNotes: null,
      manufactureYear: 2024,
      mileageKm: 12000,
      modelYear: 2025,
      plate: "ABC1D23",
      priceCents: 18990000,
      publicSlug: "veiculo-teste",
      resaleAnalysis: null,
      status: "published",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Veículo de teste",
      transmission: "automatic",
      trimName: "Touring",
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T12:00:00.000Z",
      videoUrl: null,
    },
    media: [],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: [
      {
        colorName: "black",
        createdAt: "2026-01-01T12:00:00.000Z",
        id: "unit_1",
        listingId: "listing_1",
        plate: "ABC1D23",
        status: "available",
        stockNumber: "EST-1",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-01-01T12:00:00.000Z",
        vin: "9BWZZZ377VT004251",
      },
    ],
  };

  return {
    ...detail,
    ...overrides,
    listing: { ...detail.listing, ...overrides.listing },
  };
}
