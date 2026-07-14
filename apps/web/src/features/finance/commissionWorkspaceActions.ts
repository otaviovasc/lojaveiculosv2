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
) {
  const entriesToPay = pendingSellerEntries(context.seller, context.filters);
  context.setPayingSellerId(context.seller.sellerId);
  try {
    await Promise.all(
      entriesToPay.map((entry) => context.api.payEntry(entry.id)),
    );
    context.setToast({
      kind: "success",
      message: `${entriesToPay.length} lançamento(s) pagos`,
      title: "Comissões pagas",
    });
    context.onPaid();
    context.refresh();
  } catch (error) {
    context.setToast({
      kind: "error",
      message: formatApiErrorDisplay(
        error,
        "Não foi possível pagar as comissões.",
      ),
      title: "Erro ao pagar",
    });
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
