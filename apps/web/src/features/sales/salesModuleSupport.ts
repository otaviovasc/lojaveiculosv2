import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SaleContextOptionsState } from "./saleContextOptions";
import type { SaleRecord } from "./types";

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
