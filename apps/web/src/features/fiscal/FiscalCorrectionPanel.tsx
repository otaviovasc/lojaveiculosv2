import { X } from "lucide-react";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { readDocumentError } from "./fiscalDocumentDisplay";
import {
  amountFromInput,
  computeIssueTotalCents,
  formatBrl,
  type FiscalIssueDraft,
} from "./fiscalIssueModel";
import {
  getFiscalDocumentKindLabel,
  getFiscalDocumentStatusLabel,
} from "./fiscalLabels";
import type { FiscalDocument } from "./types";

export function FiscalCorrectionPanel({
  document,
  draft,
  onDismiss,
}: {
  document: FiscalDocument;
  draft: FiscalIssueDraft;
  onDismiss: () => void;
}) {
  const isNfe = draft.kind === "nfe";
  const total = isNfe
    ? computeIssueTotalCents(draft.items) / 100
    : amountFromInput(draft.nfse.grossAmount);
  const itemsLabel = isNfe
    ? draft.items
        .map((item) => item.description)
        .filter(Boolean)
        .join("; ") || "—"
    : "Comissão de serviço (NFS-e)";
  const recipientLabel = isNfe
    ? [draft.recipient.name, draft.recipient.document]
        .filter(Boolean)
        .join(" · ")
    : draft.nfse.recipientId
      ? "Tomador do catálogo fiscal"
      : "—";
  const errorMessage = readDocumentError(document);

  return (
    <FeatureAlert
      action={
        <button
          aria-label="Dispensar dados recuperados"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-xs font-bold text-muted transition-colors hover:text-app-text"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
          Dispensar
        </button>
      }
      title={`Corrigir e reenviar ${getFiscalDocumentKindLabel(document.documentKind)}`}
      tone="warning"
    >
      <p>
        A nota foi registrada como{" "}
        <strong>{getFiscalDocumentStatusLabel(document.status)}</strong> pelo
        provedor. Recuperamos abaixo os dados da emissão original — confira cada
        campo no formulário de emissão, ajuste o que for necessário e transmita
        novamente.
      </p>
      {errorMessage ? (
        <p className="mt-1 font-bold">Motivo informado: {errorMessage}</p>
      ) : null}
      <dl className="mt-3 grid gap-2 text-xs font-semibold sm:grid-cols-2">
        <div>
          <dt className="font-black uppercase tracking-wide">Referência</dt>
          <dd>{draft.externalReference || "—"}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-wide">Destinatário</dt>
          <dd>{recipientLabel || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-black uppercase tracking-wide">Itens</dt>
          <dd>{itemsLabel}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-wide">Total</dt>
          <dd>{total > 0 ? formatBrl(total) : "—"}</dd>
        </div>
      </dl>
    </FeatureAlert>
  );
}
