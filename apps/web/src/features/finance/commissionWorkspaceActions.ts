import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FinanceApi } from "./apiClient";
import { toBonusEntryDraft } from "./CommissionActions";
import type { BonusDraft } from "./CommissionDialogs";
import { updateEntryFromDraft } from "./financeBillsActions";
import {
  toEntryInput,
  type FinanceEntryDraft,
  type FinanceToast,
} from "./financeBillsModel";
import {
  pendingSellerEntries,
  type CommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import type { FinanceEntry } from "./types";

type ToastContext = {
  setToast: (toast: FinanceToast) => void;
};

export function selectedCommissionBonusSellerId(
  seller: CommissionSellerGroup | null,
) {
  if (!seller) return null;
  return seller.sellerId === "unassigned" ? "" : seller.sellerId;
}

export async function createCommissionBonus(
  context: ToastContext & {
    api: FinanceApi;
    onSaved: () => void;
    refresh: () => void;
    setSaving: (saving: boolean) => void;
  },
  draft: BonusDraft,
) {
  context.setSaving(true);
  try {
    await context.api.createEntryFlow({
      ...toEntryInput(toBonusEntryDraft(draft)),
      metadata: {
        notes: draft.notes.trim(),
        origin: "manual_bonus",
        source: "commissions_slice",
      },
    });
    context.setToast({
      kind: "success",
      message: draft.name,
      title: "Bônus salvo",
    });
    context.onSaved();
    context.refresh();
  } catch (error) {
    context.setToast({
      kind: "error",
      message: formatApiErrorDisplay(error, "Não foi possível salvar o bônus."),
      title: "Erro ao salvar bônus",
    });
  } finally {
    context.setSaving(false);
  }
}

export async function payCommissionSeller(
  context: ToastContext & {
    api: FinanceApi;
    filters: CommissionFilters;
    onPaid: () => void;
    refresh: () => void;
    seller: CommissionSellerGroup;
    setPayingSellerId: (sellerId: string | null) => void;
  },
  paidAt: string,
) {
  const entriesToPay = pendingSellerEntries(context.seller, context.filters);
  if (!entriesToPay.length) {
    context.setToast({
      kind: "error",
      message: "A conferência não encontrou lançamentos aptos para pagamento.",
      title: "Nenhuma pendência apta",
    });
    context.onPaid();
    context.refresh();
    return;
  }
  context.setPayingSellerId(context.seller.sellerId);
  try {
    const result = await context.api.settleCommissionEntries({
      entryIds: entriesToPay.map((entry) => entry.id),
      paidAt: `${paidAt}T12:00:00.000Z`,
      sellerUserId: context.seller.sellerId,
    });
    const currency = new Intl.NumberFormat("pt-BR", {
      currency: "BRL",
      style: "currency",
    }).format(result.totalCents / 100);
    context.setToast({
      kind: "success",
      message:
        result.updatedCount > 0
          ? `${result.updatedCount} lançamento(s) pagos · ${currency}`
          : `Este fechamento de ${currency} já havia sido concluído. Nenhuma baixa foi duplicada.`,
      title:
        result.updatedCount > 0
          ? "Comissões pagas"
          : "Fechamento já processado",
    });
    context.onPaid();
    context.refresh();
  } catch (error) {
    context.setToast({
      kind: "error",
      message: formatApiErrorDisplay(
        error,
        "Nada foi baixado. A conferência será atualizada para você tentar novamente.",
      ),
      title: "Fechamento não concluído",
    });
    context.refresh();
  } finally {
    context.setPayingSellerId(null);
  }
}

export async function updateCommissionDraft(
  context: ToastContext & {
    api: FinanceApi;
    entry: FinanceEntry;
    onSaved: () => void;
    refresh: () => void;
  },
  draft: FinanceEntryDraft,
) {
  await updateEntryFromDraft(context.api, context.entry, draft);
  context.setToast({
    kind: "success",
    message: draft.name,
    title: "Comissão salva",
  });
  context.onSaved();
  context.refresh();
}
