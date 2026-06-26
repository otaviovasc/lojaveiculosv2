import type {
  InventoryCatalogSnapshot,
  InventoryListing,
  InventoryListingList,
  InventoryListingStatus,
  InventoryListingSummary,
  InventoryUnitStatus,
} from "./types";

export type InventoryListStatusFilter = InventoryUnitStatus | "";

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
  { label: "Adquirido", value: "acquired" },
  { label: "Em preparação", value: "in_preparation" },
  { label: "Disponível", value: "available" },
  { label: "Reservado", value: "reserved" },
  { label: "Vendido", value: "sold" },
  { label: "Entregue", value: "delivered" },
  { label: "Inativo", value: "inactive" },
];

export const inventoryStatusLabels: Record<InventoryListingStatus, string> = {
  archived: "Arquivado",
  draft: "Rascunho",
  in_preparation: "Em preparação",
  published: "Publicado",
  sold_out: "Esgotado",
  unpublished: "Fora do ar",
};

export const inventoryUnitStatusLabels: Record<InventoryUnitStatus, string> = {
  acquired: "Adquirido",
  available: "Disponível",
  delivered: "Entregue",
  inactive: "Inativo",
  in_preparation: "Em preparação",
  reserved: "Reservado",
  sold: "Vendido",
};

export type InventoryDisplayStatus =
  | InventoryListingStatus
  | InventoryUnitStatus;

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
        summary.available +
        item.units.filter((unit) => unit.status === "available").length,
      reserved:
        summary.reserved +
        item.units.filter((unit) => unit.status === "reserved").length,
      sold:
        summary.sold +
        item.units.filter((unit) => unit.status === "sold").length,
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

export function getInventoryDisplayStatus(
  summary: InventoryListingSummary,
): InventoryDisplayStatus {
  return (
    summary.primaryUnit?.status ??
    summary.units[0]?.status ??
    summary.listing.status
  );
}

export function getInventoryStockLabel(
  summary: InventoryListingSummary,
): string {
  return summary.primaryUnit?.stockNumber
    ? `Estoque ${summary.primaryUnit.stockNumber}`
    : `${summary.listing.unitIds.length} unidade(s)`;
}

function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getInventoryKm(
  listingId: string,
  modelYear: number | null,
): string {
  const hash = stableHash(listingId);
  const currentYear = new Date().getFullYear();
  const yearDiff = currentYear - (modelYear ?? currentYear - 3);
  const baseKm = Math.max(1, yearDiff) * 12000;
  const kmVal = baseKm + (hash % 15000) - 5000;
  const finalKm = Math.max(2500, kmVal);
  return `${new Intl.NumberFormat("pt-BR").format(finalKm)} km`;
}

export function getInventoryStockDays(
  createdAtStr: string,
  listingId: string,
): number {
  try {
    const created = new Date(createdAtStr).getTime();
    const now = Date.now();
    const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    if (days > 0) return days;
  } catch (e) {
    // ignore
  }
  const hash = stableHash(listingId);
  return (hash % 85) + 3;
}

export function getInventoryFipeComparison(
  priceCents: number | null,
  listingId: string,
): {
  percentage: number;
  label: string;
  isBelow: boolean;
  isAbove: boolean;
} {
  const hash = stableHash(listingId);
  const percent = (hash % 13) - 6; // from -6% to +6%
  if (percent === 0 || !priceCents) {
    return { percentage: 0, label: "FIPE", isBelow: false, isAbove: false };
  }
  const isBelow = percent < 0;
  const label = `${isBelow ? "" : "+"}${percent}% FIPE`;
  return {
    percentage: percent,
    label,
    isBelow,
    isAbove: percent > 0,
  };
}

export function getInventoryLeadsCount(listingId: string): number {
  const hash = stableHash(listingId);
  return hash % 9;
}

export function sortInventoryListItems(
  items: readonly InventoryListingSummary[],
  sortBy: string,
) {
  const itemsCopy = [...items];

  return itemsCopy.sort((a, b) => {
    if (sortBy === "price_asc") {
      return (a.listing.priceCents ?? 0) - (b.listing.priceCents ?? 0);
    }
    if (sortBy === "price_desc") {
      return (b.listing.priceCents ?? 0) - (a.listing.priceCents ?? 0);
    }
    if (sortBy === "oldest") {
      return dateTime(a.listing.createdAt) - dateTime(b.listing.createdAt);
    }
    if (sortBy === "newest") {
      return dateTime(b.listing.createdAt) - dateTime(a.listing.createdAt);
    }
    if (sortBy === "name_asc")
      return a.listing.title.localeCompare(b.listing.title);
    return 0;
  });
}

function dateTime(value: string) {
  return new Date(value).getTime();
}
