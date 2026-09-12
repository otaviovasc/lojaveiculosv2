import { Clock3, KeyRound, Link2, ShieldCheck } from "lucide-react";
import {
  readDocumentError,
  readDocumentRecipientDocument,
  readDocumentRecipientName,
  readExternalReference,
} from "./fiscalDocumentDisplay";
import {
  formatFiscalDate,
  getFiscalDocumentKindLabel,
  getFiscalDocumentStatusLabel,
  getFiscalDocumentTypeLabel,
} from "./fiscalLabels";
import type { FiscalDocument, FiscalEvent } from "./types";

export function FiscalDocumentDetails({
  document,
  events,
  id,
}: {
  document: FiscalDocument;
  events: readonly FiscalEvent[];
  id: string;
}) {
  const history = events
    .filter((event) => event.fiscalDocumentId === document.id)
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    );
  const error = readDocumentError(document);
  const recipientName = readDocumentRecipientName(document);
  const recipientDocument = readDocumentRecipientDocument(document);
  return (
    <section
      aria-label={`Detalhes do ${getFiscalDocumentTypeLabel(document.documentType)}`}
      className="fiscal-document-details"
      id={id}
    >
      <div className="fiscal-document-details__header">
        <div>
          <span className="fiscal-document-details__eyebrow">
            Documento e rastreabilidade
          </span>
          <h3>Detalhes fiscais</h3>
        </div>
        <span className="fiscal-document-details__provider">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {document.hasProviderReference
            ? "Vínculo oficial confirmado"
            : "Sem vínculo oficial no provedor"}
        </span>
      </div>

      <dl className="fiscal-document-details__grid">
        <Detail
          label="Documento"
          value={`${getFiscalDocumentKindLabel(document.documentKind)} · ${getFiscalDocumentTypeLabel(document.documentType)}`}
        />
        <Detail
          label="Status atual"
          value={getFiscalDocumentStatusLabel(document.status)}
        />
        <Detail
          label="Destinatário"
          value={
            [recipientName, recipientDocument].filter(Boolean).join(" · ") ||
            "Não informado"
          }
        />
        <Detail
          label="Criado em"
          value={formatFiscalDate(document.createdAt)}
        />
        <Detail
          label="Emitido em"
          value={
            document.issuedAt
              ? formatFiscalDate(document.issuedAt)
              : "Ainda não emitido"
          }
        />
        <Detail
          icon={Link2}
          label="Referência da operação"
          value={readExternalReference(document) ?? "Não informada"}
        />
      </dl>

      {document.accessKey ? (
        <div className="fiscal-document-details__access-key">
          <KeyRound aria-hidden="true" className="size-4" />
          <span>
            <strong>Chave de acesso</strong>
            {document.accessKey}
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="fiscal-document-details__error" role="status">
          {error}
        </p>
      ) : null}

      <div className="fiscal-document-details__history">
        <h4>
          <Clock3 aria-hidden="true" className="size-4" />
          Histórico de status
        </h4>
        {history.length ? (
          <ol>
            {history.map((event, index) => (
              <li
                key={`${event.fiscalDocumentId}-${event.occurredAt}-${index}`}
              >
                <span>{eventLabel(event.eventType)}</span>
                <time dateTime={event.occurredAt}>
                  {formatFiscalDate(event.occurredAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>O histórico detalhado ainda não está disponível para esta nota.</p>
        )}
      </div>
    </section>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Link2;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>
        {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function eventLabel(eventType: string) {
  if (eventType === "created") return "Solicitação registrada";
  if (eventType === "status_changed") return "Status atualizado";
  if (eventType.toLowerCase().includes("cancel"))
    return "Cancelamento atualizado";
  return "Atualização do documento";
}
