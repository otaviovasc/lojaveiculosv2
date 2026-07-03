import { saleMissingFields } from "./salesModel";
import type { SaleRecord, SaleStatus } from "./types";

export type SalesStatusFilter = SaleStatus | "all";
export type SalesSortOption =
  | "date_desc"
  | "date_asc"
  | "value_desc"
  | "value_asc"
  | "validation_desc"
  | "validation_asc";

export const salesStatusLabels: Record<SaleStatus, string> = {
  cancelled: "Cancelada",
  closed: "Fechada",
  draft: "Rascunho",
  pending: "Reservada",
};

export const salesStatusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "draft", label: "Rascunho" },
  { value: "pending", label: "Reservada" },
  { value: "closed", label: "Fechada" },
  { value: "cancelled", label: "Cancelada" },
];

export const salesSortOptions = [
  { value: "date_desc", label: "Mais Recentes" },
  { value: "date_asc", label: "Mais Antigas" },
  { value: "value_desc", label: "Maior Valor" },
  { value: "value_asc", label: "Menor Valor" },
  { value: "validation_desc", label: "Mais Validada" },
  { value: "validation_asc", label: "Menos Validada" },
];

export function saleStatusTone(status: SaleStatus) {
  if (status === "closed") return "success";
  if (status === "pending") return "warning";
  if (status === "draft") return "blue";
  return "neutral";
}

export function getSaleRequirementsScore(sale: SaleRecord) {
  const missing = saleMissingFields(sale);
  const total = 6;
  return {
    completed: total - missing.length,
    missing,
    total,
  };
}

export function filterSales(
  sales: readonly SaleRecord[],
  filters: {
    endDate: Date | null;
    filter: SalesStatusFilter;
    search: string;
    startDate: Date | null;
  },
) {
  return sales.filter((sale) => {
    if (filters.filter !== "all" && sale.status !== filters.filter) {
      return false;
    }

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      const title = String(sale.listingSnapshot?.title ?? "").toLowerCase();
      const buyerName = String(sale.buyerSnapshot?.name ?? "").toLowerCase();
      const plate = String(sale.listingSnapshot?.plate ?? "").toLowerCase();
      const unit = String(sale.listingSnapshot?.unitLabel ?? "").toLowerCase();
      const matchesSearch =
        title.includes(query) ||
        buyerName.includes(query) ||
        sale.id.toLowerCase().includes(query) ||
        plate.includes(query) ||
        unit.includes(query);
      if (!matchesSearch) return false;
    }

    const saleMs = new Date(sale.updatedAt).getTime();
    if (filters.startDate && saleMs < filters.startDate.getTime()) return false;
    if (filters.endDate) {
      const endMs = filters.endDate.getTime() + 24 * 60 * 60 * 1000;
      if (saleMs > endMs) return false;
    }

    return true;
  });
}

export function sortSales(
  sales: readonly SaleRecord[],
  sortBy: SalesSortOption,
) {
  return [...sales].sort((a, b) => {
    switch (sortBy) {
      case "date_desc":
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case "date_asc":
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      case "value_desc":
        return (b.salePriceCents ?? 0) - (a.salePriceCents ?? 0);
      case "value_asc":
        return (a.salePriceCents ?? 0) - (b.salePriceCents ?? 0);
      case "validation_desc":
        return (
          getSaleRequirementsScore(b).completed -
          getSaleRequirementsScore(a).completed
        );
      case "validation_asc":
        return (
          getSaleRequirementsScore(a).completed -
          getSaleRequirementsScore(b).completed
        );
      default:
        return 0;
    }
  });
}
