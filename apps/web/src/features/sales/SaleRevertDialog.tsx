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
  const [reason, setReason] = useState("");
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
          <DialogTitle>Reverter venda fechada</DialogTitle>
          <DialogDescription className="font-bold leading-relaxed text-muted">
            A venda original será preservada. Os documentos emitidos serão
            invalidados, os lançamentos vinculados cancelados e uma nova revisão
            editável será criada com o veículo disponível em estoque.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wider text-muted">
          Motivo da correção
          <FeatureTextarea
            aria-label="Motivo da correção"
            autoFocus
            disabled={isSaving}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Descreva o dado ou condição que precisa ser corrigido"
            value={reason}
          />
        </label>
        <DialogFooter>
          <div className="w-full">
            <FeatureDialogActions
              confirmDisabled={!reason.trim()}
              confirmLabel="Reverter venda"
              isLoading={isSaving}
              loadingLabel="Revertendo"
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
