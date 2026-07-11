import type { RefObject } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { toDraftInput } from "./salesModel";
import type { SaleRecord } from "./types";

export type SaleSaveState = {
  inFlight: Promise<SaleRecord> | null;
  lastResult: SaleRecord | null;
  saved: string;
  submitted: string;
};

export function createSaleSaveState(sale: SaleRecord | null): SaleSaveState {
  const serialized = sale ? serializeSaleDraft(sale) : "";
  return {
    inFlight: null,
    lastResult: sale,
    saved: serialized,
    submitted: serialized,
  };
}

export function resetSaleSaveState(
  state: SaleSaveState,
  sale: SaleRecord | null,
) {
  const serialized = sale ? serializeSaleDraft(sale) : "";
  state.lastResult = sale;
  state.saved = serialized;
  state.submitted = serialized;
}

export function isSaleDraftSaved(state: SaleSaveState, sale: SaleRecord) {
  return serializeSaleDraft(sale) === state.saved;
}

export async function saveSaleDraft(
  state: SaleSaveState,
  sale: SaleRecord,
  onSave: (sale: SaleRecord) => Promise<SaleRecord>,
) {
  if (state.inFlight) await state.inFlight;
  const submitted = serializeSaleDraft(sale);
  if (submitted === state.saved || submitted === state.submitted) {
    return { sale: state.lastResult ?? sale, submitted: null };
  }

  const save = onSave(sale);
  state.inFlight = save;
  try {
    const saved = await save;
    state.lastResult = saved;
    state.saved = serializeSaleDraft(saved);
    state.submitted = submitted;
    return { sale: saved, submitted };
  } finally {
    if (state.inFlight === save) state.inFlight = null;
  }
}

export function serializeSaleDraft(sale: SaleRecord) {
  return JSON.stringify(toDraftInput(sale));
}

export function saleSaveErrorMessage(error: unknown) {
  return formatApiErrorDisplay(error, "Não foi possível salvar a venda.");
}

export function clearSaleAutosaveTimer(ref: RefObject<number | undefined>) {
  if (ref.current === undefined) return;
  window.clearTimeout(ref.current);
  ref.current = undefined;
}
