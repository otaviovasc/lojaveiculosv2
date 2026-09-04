import { AppApiError, formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SaleContextOptionsState } from "./saleContextOptions";
import type { SaleRecord, SaleStartContext } from "./types";

export function contextMessage(state: SaleContextOptionsState): string | null {
  if (state.kind === "loading") {
    return "Carregando leads, veiculos e vendedores vinculaveis.";
  }
  if (state.kind === "error") return state.message;
  return null;
}

export function replaceSale(
  current: readonly SaleRecord[],
  next: SaleRecord,
): readonly SaleRecord[] {
  return current.some((sale) => sale.id === next.id)
    ? current.map((sale) => (sale.id === next.id ? next : sale))
    : [next, ...current];
}

export function salesErrorMessage(error: unknown): string {
  return formatApiErrorDisplay(error, "Não foi possível carregar as vendas.");
}

export function isSaleUnitConflict(error: unknown): boolean {
  return error instanceof AppApiError && error.code === "SALE_UNIT_CONFLICT";
}

export function findCurrentSaleForContext(
  sales: readonly SaleRecord[],
  context: SaleStartContext,
): SaleRecord | undefined {
  return sales.find(
    (sale) =>
      sale.isCurrentRevision &&
      sale.status !== "cancelled" &&
      (context.unitId
        ? sale.unitId === context.unitId
        : context.listingId
          ? sale.listingId === context.listingId
          : false),
  );
}
