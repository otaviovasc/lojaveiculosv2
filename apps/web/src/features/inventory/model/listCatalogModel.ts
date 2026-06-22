import type {
  InventoryCatalogSnapshot,
  InventoryListing,
  InventoryListingList,
  InventoryListingStatus,
  InventoryListingSummary,
} from "./types";

export type InventoryListStatusFilter = InventoryListingStatus | "";

export type InventoryListQueryInput = {
  offset?: number;
  search: string;
  status: InventoryListStatusFilter;
};

export type InventoryListState =
  | { kind: "loading" }
  | { kind: "ready"; result: InventoryListingList }
  | { kind: "error"; message: string };

export type InventoryDetailSelectionState =
  | { kind: "idle" }
  | { kind: "loading"; listingId: string }
  | { kind: "ready"; listingId: string }
  | { kind: "error"; message: string };

export const inventoryListStatusOptions: Array<{
  label: string;
  value: InventoryListStatusFilter;
}> = [
  { label: "Todos os status", value: "" },
  { label: "Rascunho", value: "draft" },
  { label: "Disponivel", value: "available" },
  { label: "Reservado", value: "reserved" },
  { label: "Vendido", value: "sold" },
  { label: "Inativo", value: "inactive" },
];

export const inventoryStatusLabels: Record<InventoryListingStatus, string> = {
  available: "Disponivel",
  draft: "Rascunho",
  inactive: "Inativo",
  reserved: "Reservado",
  sold: "Vendido",
};

export function createInventoryErrorState(error: unknown): InventoryListState {
  return {
    kind: "error",
    message: error instanceof Error ? error.message : String(error),
  };
}

export function createListQuery(input: InventoryListQueryInput) {
  return {
    limit: 100,
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
    ...(input.search.trim() ? { search: input.search.trim() } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

export function summarizeInventoryList(result: InventoryListingList) {
  return result.items.reduce(
    (summary, item) => ({
      available:
        summary.available + (item.listing.status === "available" ? 1 : 0),
      reserved:
        summary.reserved + (item.listing.status === "reserved" ? 1 : 0),
      sold: summary.sold + (item.listing.status === "sold" ? 1 : 0),
      total: summary.total + 1,
    }),
    { available: 0, reserved: 0, sold: 0, total: 0 },
  );
}

export function formatInventoryPrice(value: number | null): string {
  if (value === null) return "Preco sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

export function getInventoryCatalogLine(
  catalog: InventoryCatalogSnapshot | null,
  fallback: InventoryListing,
): string {
  if (!catalog) return fallback.trimName ?? "Catalogo pendente";

  return [catalog.brandName, catalog.modelName, fallback.trimName]
    .filter(Boolean)
    .join(" - ");
}

export function getInventoryYearLine(listing: InventoryListing): string {
  if (listing.manufactureYear && listing.modelYear) {
    return `${listing.manufactureYear}/${listing.modelYear}`;
  }

  return String(listing.manufactureYear ?? listing.modelYear ?? "-");
}

export function getInventoryPlate(summary: InventoryListingSummary): string {
  return summary.primaryUnit?.plate ?? summary.listing.plate ?? "-";
}

export function getInventoryStockLabel(
  summary: InventoryListingSummary,
): string {
  return summary.primaryUnit?.stockNumber
    ? `Estoque ${summary.primaryUnit.stockNumber}`
    : `${summary.listing.unitIds.length} unidade(s)`;
}
