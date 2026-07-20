import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FinanceApi } from "./apiClient";
import { updateEntryFromDraft } from "./financeBillsActions";
import {
  toEntryInput,
  toRecurringInput,
  toRecurringUpdateInput,
  type FinanceEntryDraft,
  type FinanceToast,
} from "./financeBillsModel";
import type { FinanceEntry, FinanceRecurringEntry } from "./types";

type ActionContext = {
  api: FinanceApi;
  refresh: () => void;
  setToast: (toast: FinanceToast) => void;
};

export async function submitFinanceDraft(
  context: ActionContext & {
    modalEntry: FinanceEntry | null;
    modalRecurringEntry: FinanceRecurringEntry | null;
  },
  draft: FinanceEntryDraft,
) {
  try {
    if (context.modalRecurringEntry) {
      await context.api.updateRecurringEntry(
        context.modalRecurringEntry.id,
        toRecurringUpdateInput(draft, context.modalRecurringEntry.metadata),
      );
      context.setToast({
        kind: "success",
        message: draft.name,
        title: "Recorrência salva",
      });
    } else if (context.modalEntry) {
      await updateEntryFromDraft(context.api, context.modalEntry, draft);
      context.setToast({
        kind: "success",
        message: draft.name,
        title: "Lançamento salvo",
      });
    } else if (draft.recurrence === "recurring") {
      await context.api.createRecurringEntry(toRecurringInput(draft));
      context.setToast({
        kind: "success",
        message: draft.name,
        title: "Recorrência criada",
      });
    } else {
      await context.api.createEntryFlow(toEntryInput(draft));
      context.setToast({
        kind: "success",
        message: draft.name,
        title: "Lançamento criado",
      });
    }
    context.refresh();
  } catch (error) {
    context.setToast({
      kind: "error",
      message: formatApiErrorDisplay(
        error,
        "Não foi possível salvar o lançamento.",
      ),
      title: "Erro ao salvar",
    });
    throw error;
  }
}

export async function updateFinanceEntryStatus(
  context: ActionContext,
  entry: FinanceEntry,
  action: "pay" | "pending",
) {
  try {
    if (action === "pay") await context.api.payEntry(entry.id);
    else {
      await context.api.updateEntry(entry.id, {
        paidAt: null,
        status: "pending",
      });
    }
    context.refresh();
  } catch (error) {
    context.setToast({
      kind: "error",
      message: formatApiErrorDisplay(
        error,
        "Não foi possível alterar o status do lançamento.",
      ),
      title: "Erro ao alterar status",
    });
  }
}

export async function cancelFinanceRecurringEntry(
  context: ActionContext,
  entry: FinanceRecurringEntry,
) {
  try {
    await context.api.cancelRecurringEntry(
      entry.id,
      "Cancelado pela tela de gastos.",
    );
    context.setToast({
      kind: "success",
      message: entry.name,
      title: "Recorrência cancelada",
    });
    context.refresh();
  } catch (error) {
    context.setToast({
      kind: "error",
      message: formatApiErrorDisplay(
        error,
        "Não foi possível cancelar a recorrência.",
      ),
      title: "Erro ao cancelar",
    });
  }
}
