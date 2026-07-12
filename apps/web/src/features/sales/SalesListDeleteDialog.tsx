import { AlertTriangle, Trash2 } from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";

export function SalesListDeleteDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <FeatureDialog
      className="feature-dialog--medium sales-delete-dialog"
      footer={
        <FeatureDialogActions
          confirmIcon={<Trash2 aria-hidden="true" />}
          confirmLabel="Excluir rascunho"
          onCancel={onClose}
          onConfirm={onConfirm}
          variant="danger"
        />
      }
      isOpen
      onClose={onClose}
      title={
        <span className="sales-delete-dialog__title">
          <Trash2 aria-hidden="true" />
          Excluir rascunho de venda
        </span>
      }
    >
      <div className="sales-delete-dialog__content">
        <p>
          O rascunho será removido da lista e não poderá ser recuperado depois.
        </p>
        <div className="sales-delete-dialog__warning" role="note">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Remoção permanente</strong>
            <p>
              Somente vendas ainda em rascunho podem ser excluídas. Vendas
              reservadas ou concluídas permanecem preservadas.
            </p>
          </div>
        </div>
      </div>
    </FeatureDialog>
  );
}
