import { formatApiErrorDisplay } from "../../../lib/apiErrors";
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
  InventoryListingStatus | InventoryUnitStatus;

export function createInventoryErrorState(error: unknown): InventoryListState {
  return {
    kind: "error",
    message: formatApiErrorDisplay(
      error,
      "Nao foi possivel carregar o estoque.",
    ),
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

export function getInventoryKm(mileageKm: number | null): string {
  if (mileageKm === null) return "-";
  return `${new Intl.NumberFormat("pt-BR").format(mileageKm)} km`;
}

export function getInventoryStockDays(createdAtStr: string): number {
  const created = new Date(createdAtStr).getTime();
  if (Number.isNaN(created)) return 0;
  const days = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export type InventoryFipeComparison = {
  percentage: number;
  label: string;
  isBelow: boolean;
  isAbove: boolean;
};

export function getInventoryFipeComparison(
  priceCents: number | null,
  fipePriceCents: number | null,
): InventoryFipeComparison | null {
  if (!priceCents || !fipePriceCents || fipePriceCents <= 0) return null;
  const percent = Math.round(
    ((priceCents - fipePriceCents) / fipePriceCents) * 100,
  );
  if (percent === 0) {
    return { percentage: 0, label: "FIPE", isBelow: false, isAbove: false };
  }
  const isBelow = percent < 0;
  return {
    percentage: percent,
    label: `${isBelow ? "" : "+"}${percent}% FIPE`,
    isBelow,
    isAbove: percent > 0,
  };
}

export type InventoryLeadInterestLevel =
  "none" | "healthy" | "hot" | "very_hot";

export function getInventoryLeadInterestLevel(
  leads: number,
): InventoryLeadInterestLevel {
  if (leads >= 6) return "very_hot";
  if (leads >= 3) return "hot";
  if (leads >= 1) return "healthy";
  return "none";
}
