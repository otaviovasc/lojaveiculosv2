export function listingDetailResult() {
  return {
    checklists: [],
    costs: [],
    documents: [
      {
        createdAt: "2026-01-01T00:00:00.000Z",
        fileName: "document.pdf",
        fileSizeBytes: 4096,
        id: "document_1",
        kind: "vehicle_registration" as const,
        linkRole: "primary",
        metadata: {},
        mimeType: "application/pdf",
        status: "draft" as const,
        storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/document.pdf",
        storeId: "store_1",
        targetId: "unit_1",
        targetType: "vehicle_unit" as const,
        tenantId: "tenant_1",
        title: "Registration",
        updatedAt: "2026-01-01T00:00:00.000Z",
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    listing: listingDto(),
    media: [
      {
        altText: "Front photo",
        createdAt: "2026-01-01T00:00:00.000Z",
        displayOrder: 0,
        id: "media_1",
        isPublic: true,
        kind: "photo" as const,
        storageKey: "tenants/tenant_1/stores/store_1/units/unit_1/front.jpg",
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId: "unit_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        url: "https://cdn.local/front.jpg",
      },
    ],
    priceHistory: [],
    status: "ready" as const,
    statusHistory: [],
    units: [unitDto()],
  };
}

export function listingDto() {
  return {
    catalog: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: "Clean vehicle",
    doors: null,
    engineAspiration: null,
    engineDisplacement: null,
    fuelType: null,
    id: "listing_1",
    internalNotes: null,
    isVisibleOnPublicSite: true,
    manufactureYear: null,
    mileageKm: null,
    modelYear: null,
    plate: "ABC1D23",
    priceCents: 12000000,
    publicSlug: "fiat-toro",
    status: "published" as const,
    storeId: "store_1",
    tenantId: "tenant_1",
    title: "Fiat Toro",
    transmission: null,
    trimName: null,
    unitIds: ["unit_1"],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function unitDto() {
  return {
    colorName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available" as const,
    stockNumber: "stock_1",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: "vin_1",
  };
}
