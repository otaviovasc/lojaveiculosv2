import { TriangleAlert, X } from "lucide-react";
import "../../styles/fiscal-documents.css";
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
    <section
      aria-live="polite"
      className="fiscal-correction"
      data-tone="warning"
      role="status"
    >
      <span aria-hidden="true" className="fiscal-correction__watermark">
        <TriangleAlert />
      </span>
      <header className="fiscal-correction__header">
        <div className="fiscal-correction__heading">
          <span aria-hidden="true" className="fiscal-correction__mark">
            <TriangleAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="fiscal-correction__eyebrow">Correção de emissão</p>
            <h3 className="fiscal-correction__title">
              Corrigir e reenviar{" "}
              {getFiscalDocumentKindLabel(document.documentKind)}
            </h3>
          </div>
        </div>
        <button
          aria-label="Dispensar dados recuperados"
          className="fiscal-correction__dismiss"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
          Dispensar
        </button>
      </header>
      <div className="fiscal-correction__body">
        <p>
          A nota foi registrada como{" "}
          <strong>{getFiscalDocumentStatusLabel(document.status)}</strong> pelo
          provedor. Recuperamos abaixo os dados da emissão original — confira
          cada campo no formulário de emissão, ajuste o que for necessário e
          transmita novamente.
        </p>
        {errorMessage ? (
          <p className="fiscal-correction__reason">
            Motivo informado: {errorMessage}
          </p>
        ) : null}
      </div>
      <dl className="fiscal-correction__fields">
        <div className="fiscal-correction__field">
          <dt>Referência</dt>
          <dd>{draft.externalReference || "—"}</dd>
        </div>
        <div className="fiscal-correction__field">
          <dt>Destinatário</dt>
          <dd>{recipientLabel || "—"}</dd>
        </div>
        <div className="fiscal-correction__field sm:col-span-2">
          <dt>Itens</dt>
          <dd>{itemsLabel}</dd>
        </div>
        <div className="fiscal-correction__field">
          <dt>Total</dt>
          <dd>{total > 0 ? formatBrl(total) : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
