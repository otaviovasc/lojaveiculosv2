import type { FinanceApi } from "./apiClient";
import type { BonusDraft } from "./CommissionDialogs";
import {
  createEntryDraft,
  type FinanceEntryDraft,
  type FinanceToast,
} from "./financeBillsModel";
import type { FinanceEntry } from "./types";

export async function cancelCommission(
  entry: FinanceEntry,
  api: FinanceApi | null,
  setToast: (toast: FinanceToast) => void,
  refresh: () => void,
) {
  if (!api || !window.confirm(`Cancelar ${entry.name}?`)) return;
  await api.cancelEntry(entry.id, "Cancelado pela tela de comissoes.");
  setToast({ kind: "success", title: "Comissao cancelada", message: entry.name });
  refresh();
}

export function CommissionToast({ toast }: { toast: FinanceToast }) {
  return (
    <div className="rounded-lg border border-line bg-accent-soft p-3 text-sm font-black text-accent-strong">
      {toast.title}: {toast.message}
    </div>
  );
}

export function toBonusEntryDraft(draft: BonusDraft): FinanceEntryDraft {
  return {
    ...createEntryDraft("commission"),
    amount: draft.amount,
    category: "manual_bonus",
    dueAt: draft.dueAt,
    name: draft.name.trim(),
    notes: draft.notes.trim(),
    sellerUserId: draft.sellerUserId,
  };
}
