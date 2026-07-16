import { Send, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";

export function FiscalIssueReviewDialog({
  isSaving,
  onClose,
  onConfirm,
  reference,
}: {
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reference: string | null;
}) {
  return (
    <FeatureDialog
      footer={
        <FeatureDialogActions
          cancelDisabled={isSaving}
          confirmIcon={<Send aria-hidden="true" />}
          confirmLabel="Confirmar emissão"
          isLoading={isSaving}
          loadingLabel="Iniciando emissão"
          onCancel={onClose}
          onConfirm={onConfirm}
        />
      }
      icon={<ShieldCheck aria-hidden="true" />}
      isOpen={Boolean(reference)}
      onClose={onClose}
      title="Revisar antes de emitir"
    >
      <div className="grid gap-4">
        <p className="text-sm font-bold text-muted">
          Confirme que esta referência corresponde à venda revisada no sistema.
          A confirmação inicia uma operação fiscal no provedor e gera registro
          auditável.
        </p>
        <div className="rounded-lg border border-line bg-app p-4">
          <span className="text-xs font-black uppercase tracking-wider text-muted">
            Operação de origem
          </span>
          <strong className="mt-1 block break-words text-base text-app-text">
            {reference}
          </strong>
        </div>
        <div
          className="flex items-start gap-3 rounded-lg border border-warning bg-panel p-4 text-sm font-bold text-app-text"
          role="note"
        >
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>
            Se a referência estiver incorreta, cancele e volte à operação antes
            de emitir.
          </p>
        </div>
      </div>
    </FeatureDialog>
  );
}
