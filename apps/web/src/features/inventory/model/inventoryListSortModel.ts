import {
  getInventoryDisplayStatus,
  getInventoryLeadsCount,
  getInventoryPlate,
  getInventoryStockDays,
  inventoryStatusLabels,
  inventoryUnitStatusLabels,
} from "./listCatalogModel";
import type {
  InventoryListingStatus,
  InventoryListingSummary,
  InventoryUnitStatus,
} from "./types";

export type InventoryListSortKey =
  | "media_asc"
  | "media_desc"
  | "name_asc"
  | "name_desc"
  | "newest"
  | "oldest"
  | "plate_asc"
  | "plate_desc"
  | "price_asc"
  | "price_desc"
  | "status_asc"
  | "status_desc"
  | "stock_days_asc"
  | "stock_days_desc"
  | "leads_asc"
  | "leads_desc"
  | "year_asc"
  | "year_desc";

export type InventorySortableColumn =
  | "anoKm"
  | "dias"
  | "fase"
  | "fotos"
  | "leads"
  | "marcaModelo"
  | "placa"
  | "preco";

export const DEFAULT_INVENTORY_LIST_SORT: InventoryListSortKey = "newest";

export const inventoryListSortOptions: Array<{
  label: string;
  value: InventoryListSortKey;
}> = [
  { label: "Mais recentes", value: "newest" },
  { label: "Mais antigos", value: "oldest" },
  { label: "Preço: maior para menor", value: "price_desc" },
  { label: "Preço: menor para maior", value: "price_asc" },
  { label: "Marca/Modelo (A-Z)", value: "name_asc" },
  { label: "Marca/Modelo (Z-A)", value: "name_desc" },
  { label: "Placa (A-Z)", value: "plate_asc" },
  { label: "Placa (Z-A)", value: "plate_desc" },
  { label: "Ano: mais novo", value: "year_desc" },
  { label: "Ano: mais antigo", value: "year_asc" },
  { label: "Mais dias em estoque", value: "stock_days_desc" },
  { label: "Menos dias em estoque", value: "stock_days_asc" },
  { label: "Fase (A-Z)", value: "status_asc" },
  { label: "Fase (Z-A)", value: "status_desc" },
  { label: "Mais leads", value: "leads_desc" },
  { label: "Menos leads", value: "leads_asc" },
  { label: "Mais fotos", value: "media_desc" },
  { label: "Menos fotos", value: "media_asc" },
];

const columnSortPairs: Record<
  InventorySortableColumn,
  { asc: InventoryListSortKey; desc: InventoryListSortKey }
> = {
  anoKm: { asc: "year_asc", desc: "year_desc" },
  dias: { asc: "stock_days_asc", desc: "stock_days_desc" },
  fase: { asc: "status_asc", desc: "status_desc" },
  fotos: { asc: "media_asc", desc: "media_desc" },
  leads: { asc: "leads_asc", desc: "leads_desc" },
  marcaModelo: { asc: "name_asc", desc: "name_desc" },
  placa: { asc: "plate_asc", desc: "plate_desc" },
  preco: { asc: "price_asc", desc: "price_desc" },
};

export function getNextInventoryColumnSort(
  currentSort: InventoryListSortKey,
  column: InventorySortableColumn,
): InventoryListSortKey {
  const pair = columnSortPairs[column];
  if (currentSort === pair.asc) return pair.desc;
  if (currentSort === pair.desc) return DEFAULT_INVENTORY_LIST_SORT;
  return pair.asc;
}

export function getInventoryColumnSortDirection(
  currentSort: InventoryListSortKey,
  column: InventorySortableColumn,
): "asc" | "desc" | null {
  const pair = columnSortPairs[column];
  if (currentSort === pair.asc) return "asc";
  if (currentSort === pair.desc) return "desc";
  return null;
}

export function sortInventoryListItems(
  items: readonly InventoryListingSummary[],
  sortBy: InventoryListSortKey,
) {
  return [...items].sort((left, right) =>
    compareInventoryItems(left, right, sortBy),
  );
}

function compareInventoryItems(
  left: InventoryListingSummary,
  right: InventoryListingSummary,
  sortBy: InventoryListSortKey,
) {
  switch (sortBy) {
    case "media_asc":
      return left.mediaCount - right.mediaCount;
    case "media_desc":
      return right.mediaCount - left.mediaCount;
    case "name_asc":
      return compareText(left.listing.title, right.listing.title);
    case "name_desc":
      return compareText(right.listing.title, left.listing.title);
    case "oldest":
      return (
        dateTime(left.listing.createdAt) - dateTime(right.listing.createdAt)
      );
    case "newest":
      return (
        dateTime(right.listing.createdAt) - dateTime(left.listing.createdAt)
      );
    case "plate_asc":
      return compareText(getInventoryPlate(left), getInventoryPlate(right));
    case "plate_desc":
      return compareText(getInventoryPlate(right), getInventoryPlate(left));
    case "price_asc":
      return (left.listing.priceCents ?? 0) - (right.listing.priceCents ?? 0);
    case "price_desc":
      return (right.listing.priceCents ?? 0) - (left.listing.priceCents ?? 0);
    case "status_asc":
      return compareText(statusLabel(left), statusLabel(right));
    case "status_desc":
      return compareText(statusLabel(right), statusLabel(left));
    case "stock_days_asc":
      return stockDays(left) - stockDays(right);
    case "stock_days_desc":
      return stockDays(right) - stockDays(left);
    case "leads_asc":
      return (
        getInventoryLeadsCount(left.listing.id) -
        getInventoryLeadsCount(right.listing.id)
      );
    case "leads_desc":
      return (
        getInventoryLeadsCount(right.listing.id) -
        getInventoryLeadsCount(left.listing.id)
      );
    case "year_asc":
      return inventoryYear(left) - inventoryYear(right);
    case "year_desc":
      return inventoryYear(right) - inventoryYear(left);
  }

  return 0;
}

function dateTime(value: string) {
  return new Date(value).getTime();
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "pt-BR", { sensitivity: "base" });
}

function inventoryYear(item: InventoryListingSummary) {
  return item.listing.modelYear ?? item.listing.manufactureYear ?? 0;
}

function statusLabel(item: InventoryListingSummary) {
  const status = getInventoryDisplayStatus(item);
  return status in inventoryUnitStatusLabels
    ? inventoryUnitStatusLabels[status as InventoryUnitStatus]
    : inventoryStatusLabels[status as InventoryListingStatus];
}

function stockDays(item: InventoryListingSummary) {
  return getInventoryStockDays(item.listing.createdAt, item.listing.id);
}
