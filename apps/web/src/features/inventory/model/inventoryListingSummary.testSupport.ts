import type {
  InventoryListingStatus,
  InventoryListingSummary,
  InventoryUnitStatus,
} from "./types";

type InventorySummaryOverrides = {
  createdAt?: string;
  listingStatus?: InventoryListingStatus;
  manufactureYear?: number | null;
  mediaCount?: number;
  modelYear?: number | null;
  plate?: string | null;
  priceCents?: number | null;
  title?: string;
  unitStatus?: InventoryUnitStatus;
};

export function createInventoryListingSummary(
  id: string,
  overrides: InventorySummaryOverrides = {},
): InventoryListingSummary {
  const modelYear =
    overrides.modelYear === undefined ? 2025 : overrides.modelYear;
  const manufactureYear =
    overrides.manufactureYear === undefined
      ? modelYear === null
        ? 2024
        : modelYear - 1
      : overrides.manufactureYear;
  const plate = overrides.plate === undefined ? "ABC1D23" : overrides.plate;
  const unitStatus = overrides.unitStatus ?? "available";
  const listingStatus =
    overrides.listingStatus ??
    (unitStatus === "sold" ? "sold_out" : "published");
  const createdAt = overrides.createdAt ?? "2026-01-01T00:00:00.000Z";

  const unit = {
    colorName: null,
    createdAt,
    id: `unit_${id}`,
    listingId: id,
    plate,
    status: unitStatus,
    stockNumber: "STK-1",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: null,
  } satisfies InventoryListingSummary["units"][number];

  return {
    listing: {
      catalog: {
        brandCode: "59",
        brandName: "Toyota",
        fipeCode: "002000-0",
        fuel: "Flex",
        modelCode: "123",
        modelName: "Corolla",
        modelYear: modelYear ?? 2025,
        priceCents: 12_345_678,
        referenceMonth: "junho/2026",
        source: "fipe",
        vehicleType: "cars",
        yearCode: "2025-1",
        yearName: "2025 Flex",
      },
      createdAt,
      description: null,
      doors: null,
      engineAspiration: null,
      engineDisplacement: null,
      fuelType: null,
      id,
      internalNotes: null,
      manufactureYear,
      mileageKm: null,
      modelYear,
      plate: null,
      priceCents:
        overrides.priceCents === undefined ? 12_345_678 : overrides.priceCents,
      publicSlug: null,
      status: listingStatus,
      storeId: "store_1",
      tenantId: "tenant_1",
      title: overrides.title ?? "Toyota Corolla XEI",
      transmission: null,
      trimName: "XEI",
      unitIds: [unit.id],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    mediaCount: overrides.mediaCount ?? 2,
    primaryMediaUrl: "https://cdn.local/corolla.jpg",
    primaryUnit: unit,
    units: [unit],
  };
}
