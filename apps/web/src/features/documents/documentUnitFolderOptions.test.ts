import { describe, expect, it } from "vitest";
import type { InventoryListingSummary } from "../inventory/model/types";
import type { DocumentVehicleOption } from "./documentDisplayModel";
import {
  inventorySummariesToUnitFolderOptions,
  mergeUnitFolderOptions,
} from "./documentUnitFolderOptions";

describe("document unit folder options", () => {
  it("builds unit folders from inventory summaries", () => {
    expect(inventorySummariesToUnitFolderOptions([summary()])).toEqual([
      expect.objectContaining({
        id: "unit_1",
        label: "Fiat Toro Volcano",
        listingId: "listing_1",
        plate: "ABC1D23",
        targetType: "vehicle_unit",
        unitId: "unit_1",
      }),
    ]);
  });

  it("keeps inventory labels when merging with document-derived folders", () => {
    const documentOption: DocumentVehicleOption = {
      id: "unit_1",
      label: "Rótulo antigo",
      listingId: "listing_1",
      plate: null,
      stockNumber: null,
      targetType: "vehicle_unit",
      unitId: "unit_1",
      vin: null,
    };

    expect(
      mergeUnitFolderOptions(
        inventorySummariesToUnitFolderOptions([summary()]),
        [documentOption],
      ),
    ).toEqual([
      expect.objectContaining({
        id: "unit_1",
        label: "Fiat Toro Volcano",
        stockNumber: "STK-1",
      }),
    ]);
  });
});

function summary(): InventoryListingSummary {
  const unit = {
    colorName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "unit_1",
    listingId: "listing_1",
    plate: "ABC1D23",
    status: "available" as const,
    stockNumber: "STK-1",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vin: "9BWZZZ",
  };

  return {
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
      plate: null,
      priceCents: null,
      status: "available",
      storeId: "store_1",
      tenantId: "tenant_1",
      title: "Fiat Toro Volcano",
      transmission: null,
      trimName: null,
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    mediaCount: 0,
    primaryMediaUrl: null,
    primaryUnit: unit,
    units: [unit],
  };
}
