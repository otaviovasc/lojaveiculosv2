import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import type { FinanceApi } from "./apiClient";
import { FinanceEntryModal } from "./FinanceEntryModal";
import type { FinanceEntryDraft } from "./financeBillsModel";
import type {
  FinanceEntry,
  FinanceEntryType,
  FinanceRecurringEntry,
} from "./types";

export function FinanceEntryDialogs({
  activeType,
  api,
  cancelRecurringTarget,
  cancelTarget,
  isModalOpen,
  modalEntry,
  modalRecurringEntry,
  onCancelClose,
  onCancelConfirm,
  onCancelRecurringClose,
  onCancelRecurringConfirm,
  onModalClose,
  onSubmit,
  sellerOptions,
}: {
  activeType: FinanceEntryType;
  api: FinanceApi | null;
  cancelRecurringTarget: FinanceRecurringEntry | null;
  cancelTarget: FinanceEntry | null;
  isModalOpen: boolean;
  modalEntry: FinanceEntry | null;
  modalRecurringEntry: FinanceRecurringEntry | null;
  onCancelClose: () => void;
  onCancelConfirm: () => Promise<void>;
  onCancelRecurringClose: () => void;
  onCancelRecurringConfirm: () => Promise<void>;
  onModalClose: () => void;
  onSubmit: (draft: FinanceEntryDraft) => Promise<void>;
  sellerOptions: SaleSellerOption[];
}) {
  return (
    <>
      <FinanceEntryModal
        activeType={activeType}
        api={api}
        entry={modalEntry}
        isOpen={isModalOpen}
        onClose={onModalClose}
        onSubmit={onSubmit}
        recurringEntry={modalRecurringEntry}
        sellerOptions={sellerOptions}
      />
      <ConfirmDialog
        confirmLabel="Cancelar lançamento"
        isOpen={Boolean(cancelTarget)}
        onClose={onCancelClose}
        onConfirm={onCancelConfirm}
        title="Cancelar lançamento?"
        variant="destructive"
        {...(cancelTarget
          ? {
              description: `O lançamento "${cancelTarget.name}" ficará cancelado e preservado para auditoria.`,
            }
          : {})}
      />
      <ConfirmDialog
        confirmLabel="Cancelar recorrência"
        isOpen={Boolean(cancelRecurringTarget)}
        onClose={onCancelRecurringClose}
        onConfirm={onCancelRecurringConfirm}
        title="Cancelar recorrência?"
        variant="destructive"
        {...(cancelRecurringTarget
          ? {
              description: `A recorrência "${cancelRecurringTarget.name}" deixará de gerar lançamentos e ficará preservada para auditoria.`,
            }
          : {})}
      />
    </>
  );
}
