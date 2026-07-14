import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import { FinanceEntryModal } from "./FinanceEntryModal";
import type { FinanceEntryDraft } from "./financeBillsModel";
import type { FinanceEntry, FinanceEntryType } from "./types";

export function FinanceEntryDialogs({
  activeType,
  cancelTarget,
  isModalOpen,
  modalEntry,
  onCancelClose,
  onCancelConfirm,
  onModalClose,
  onSubmit,
  sellerOptions,
}: {
  activeType: FinanceEntryType;
  cancelTarget: FinanceEntry | null;
  isModalOpen: boolean;
  modalEntry: FinanceEntry | null;
  onCancelClose: () => void;
  onCancelConfirm: () => Promise<void>;
  onModalClose: () => void;
  onSubmit: (draft: FinanceEntryDraft) => Promise<void>;
  sellerOptions: SaleSellerOption[];
}) {
  return (
    <>
      <FinanceEntryModal
        activeType={activeType}
        entry={modalEntry}
        isOpen={isModalOpen}
        onClose={onModalClose}
        onSubmit={onSubmit}
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
    </>
  );
}
