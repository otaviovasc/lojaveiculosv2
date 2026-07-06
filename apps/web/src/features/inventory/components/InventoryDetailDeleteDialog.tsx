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
      confirmLabel="Excluir veiculo"
      description="O veiculo sera removido do estoque por soft delete e nao aparecera mais nas listagens operacionais."
      {...(deleteError ? { error: deleteError } : {})}
      isLoading={isDeleting}
      isOpen={isOpen}
      loadingLabel="Excluindo"
      onClose={onClose}
      onConfirm={onConfirm}
      title="Excluir veiculo"
      variant="destructive"
    />
  );
}
