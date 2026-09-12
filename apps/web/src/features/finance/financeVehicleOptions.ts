import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import type { InventoryListingSummary } from "../inventory/model/types";

export type FinanceVehicleOption = {
  detail: string;
  id: string;
  label: string;
  listingId: string;
};

export async function loadFinanceVehicleOptions(): Promise<
  FinanceVehicleOption[]
> {
  const api = createInventoryApi(await createInventoryApiOptions());
  const items: InventoryListingSummary[] = [];
  const limit = 100;
  let offset = 0;

  for (;;) {
    const page = await api.listListings({ limit, offset });
    items.push(...page.items);
    if (!page.hasMore || page.nextOffset === null) break;
    offset = page.nextOffset;
  }

  return items
    .flatMap(toVehicleOptions)
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

function toVehicleOptions(item: InventoryListingSummary) {
  const units =
    item.units.length > 0
      ? item.units
      : item.primaryUnit
        ? [item.primaryUnit]
        : [];

  return units.map((unit, index): FinanceVehicleOption => {
    const unitReference =
      unit.stockNumber || unit.plate || `Unidade ${index + 1}`;
    return {
      detail: [unitReference, unit.plate, statusLabel(unit.status)]
        .filter(Boolean)
        .join(" · "),
      id: unit.id,
      label: `${item.listing.title} · ${unitReference}`,
      listingId: item.listing.id,
    };
  });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    acquired: "Adquirido",
    available: "Disponível",
    delivered: "Entregue",
    inactive: "Inativo",
    in_preparation: "Em preparação",
    reserved: "Reservado",
    sold: "Vendido",
  };
  return labels[status] ?? status;
}
