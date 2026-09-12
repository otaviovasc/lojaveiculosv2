import { ConfirmDialog } from "../../../components/ui/confirm-dialog";

export function InventoryDetailDeleteDialog({
  deleteError,
  isDeleting,
  isOpen,
  onClose,
  onConfirm,
}: {
  deleteError: string | null;
  isDeleting: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      cancelLabel="Cancelar"
      confirmLabel="Excluir veículo"
      description="O veículo será removido do estoque por soft delete e não aparecerá mais nas listagens operacionais."
      {...(deleteError ? { error: deleteError } : {})}
      isLoading={isDeleting}
      isOpen={isOpen}
      loadingLabel="Excluindo…"
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir veículo"
      variant="destructive"
    />
  );
}
