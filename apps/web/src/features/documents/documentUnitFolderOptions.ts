import type { InventoryListingSummary } from "../inventory/model/types";
import type { DocumentVehicleOption } from "./documentDisplayModel";

export function inventorySummariesToUnitFolderOptions(
  summaries: readonly InventoryListingSummary[],
): DocumentVehicleOption[] {
  return summaries.flatMap((summary) => {
    const units =
      summary.units.length > 0
        ? summary.units
        : summary.primaryUnit
          ? [summary.primaryUnit]
          : [];

    return units.map((unit) => ({
      id: unit.id,
      label: summary.listing.title,
      listingId: summary.listing.id,
      plate: unit.plate ?? summary.listing.plate,
      stockNumber: unit.stockNumber,
      targetType: "vehicle_unit" as const,
      unitId: unit.id,
      vin: unit.vin,
    }));
  });
}

export function mergeUnitFolderOptions(
  inventoryOptions: readonly DocumentVehicleOption[],
  documentOptions: readonly DocumentVehicleOption[],
): DocumentVehicleOption[] {
  const options = new Map<string, DocumentVehicleOption>();
  for (const option of documentOptions) options.set(option.id, option);
  for (const option of inventoryOptions) {
    const current = options.get(option.id);
    options.set(option.id, current ? { ...current, ...option } : option);
  }
  return Array.from(options.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR"),
  );
}
