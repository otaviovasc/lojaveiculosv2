import { useCallback, useEffect, useState } from "react";
import { FeatureTextarea } from "../../components/ui/FeatureControls";
import { FeatureDialogActions } from "../../components/ui/FeatureOverlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { SaleStatus } from "./types";

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
  const [reason, setReason] = useState("");
  const isReservation = status === "pending";
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isSaving) onClose();
    },
    [isSaving, onClose],
  );

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent className="rounded-2xl border-line bg-panel text-app-text">
        <DialogHeader>
          <DialogTitle>
            {isReservation ? "Cancelar reserva" : "Cancelar rascunho"}
          </DialogTitle>
          <DialogDescription className="font-bold leading-relaxed text-muted">
            {isReservation
              ? "Informe o motivo auditável. A unidade voltará ao estoque disponível e o sinal financeiro será cancelado."
              : "Informe o motivo auditável para cancelar este rascunho de venda."}
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-muted">
          Motivo do cancelamento
          <FeatureTextarea
            aria-label="Motivo do cancelamento"
            autoFocus
            disabled={isSaving}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Descreva por que a operação está sendo cancelada"
            value={reason}
          />
        </label>
        <DialogFooter>
          <div className="w-full">
            <FeatureDialogActions
              confirmDisabled={!reason.trim()}
              confirmLabel={
                isReservation ? "Cancelar reserva" : "Cancelar rascunho"
              }
              isLoading={isSaving}
              loadingLabel="Cancelando"
              onCancel={onClose}
              onConfirm={() => onConfirm(reason.trim())}
              variant="danger"
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
