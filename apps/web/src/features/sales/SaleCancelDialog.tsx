import type { SaleStatus } from "./types";
import { SaleReasonDialog } from "./SaleReasonDialog";

export function SaleCancelDialog({
  isOpen,
  isSaving,
  onClose,
  onConfirm,
  status,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  status: SaleStatus;
}) {
  const isReservation = status === "pending";
  return (
    <SaleReasonDialog
      confirmLabel={isReservation ? "Cancelar reserva" : "Cancelar rascunho"}
      description={
        isReservation
          ? "Informe o motivo auditável. A unidade voltará ao estoque disponível e o sinal financeiro será cancelado."
          : "Informe o motivo auditável para cancelar este rascunho de venda."
      }
      fieldLabel="Motivo do cancelamento"
      isOpen={isOpen}
      isSaving={isSaving}
      loadingLabel="Cancelando"
      onClose={onClose}
      onConfirm={onConfirm}
      placeholder="Descreva por que a operação está sendo cancelada"
      title={isReservation ? "Cancelar reserva" : "Cancelar rascunho"}
    />
  );
}
