import { SaleReasonDialog } from "./SaleReasonDialog";

export function SaleRevertDialog({
  isOpen,
  isSaving,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <SaleReasonDialog
      confirmLabel="Reverter venda"
      description="A venda original será preservada. Os documentos emitidos serão invalidados, os lançamentos vinculados cancelados e uma nova revisão editável será criada com o veículo disponível em estoque."
      fieldLabel="Motivo da correção"
      isOpen={isOpen}
      isSaving={isSaving}
      loadingLabel="Revertendo"
      onClose={onClose}
      onConfirm={onConfirm}
      placeholder="Descreva o dado ou condição que precisa ser corrigido"
      title="Reverter venda fechada"
    />
  );
}
