import { Send, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";

export type FiscalIssueReviewSummary = {
  itemsLabel: string;
  kindLabel: string;
  originLabel: string;
  recipientLabel: string;
  totalLabel: string;
};

export function FiscalIssueReviewDialog({
  isSaving,
  onClose,
  onConfirm,
  summary,
}: {
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: FiscalIssueReviewSummary | null;
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
      isOpen={Boolean(summary)}
      onClose={onClose}
      title="Revisar antes de emitir"
    >
      <div className="grid gap-4">
        <p className="text-sm font-bold text-muted">
          A confirmação inicia uma operação fiscal real no provedor e gera
          registro auditável. Revise os dados antes de transmitir.
        </p>
        <dl className="grid gap-3 rounded-lg border border-line bg-app p-4">
          <ReviewRow label="Tipo de documento" value={summary?.kindLabel} />
          <ReviewRow label="Origem" value={summary?.originLabel} />
          <ReviewRow label="Destinatário" value={summary?.recipientLabel} />
          <ReviewRow label="Itens" value={summary?.itemsLabel} />
          <ReviewRow label="Valor total" value={summary?.totalLabel} strong />
        </dl>
        <div
          className="flex items-start gap-3 rounded-lg border border-warning bg-panel p-4 text-sm font-bold text-app-text"
          role="note"
        >
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>
            Se algum dado estiver incorreto, cancele e ajuste a emissão antes de
            enviar. Nenhuma nota é emitida sem a confirmação do provedor.
          </p>
        </div>
      </div>
    </FeatureDialog>
  );
}

function ReviewRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs font-black uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd
        className={
          strong
            ? "break-words text-right text-base font-black text-app-text"
            : "break-words text-right text-sm font-bold text-app-text"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}
