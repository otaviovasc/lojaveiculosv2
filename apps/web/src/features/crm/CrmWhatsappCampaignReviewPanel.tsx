import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
} from "lucide-react";
import type {
  CampaignRecipientReviewRow,
  CampaignRecipientReviewSummary,
} from "./CrmWhatsappCampaignRecipientReview";

export function CampaignReviewPanel({
  canLaunch,
  intervalMinutes,
  isSaving,
  lastResult,
  localError,
  onLaunch,
  onNameChange,
  onToggleRow,
  preview,
  rows,
  selectedCount,
  summary,
}: {
  canLaunch: boolean;
  intervalMinutes: number;
  isSaving: boolean;
  lastResult: string | null;
  localError: string | null;
  onLaunch: () => void;
  onNameChange: (rowId: string, value: string) => void;
  onToggleRow: (rowId: string) => void;
  preview: string;
  rows: CampaignRecipientReviewRow[];
  selectedCount: number;
  summary: CampaignRecipientReviewSummary;
}) {
  return (
    <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-review-panel">
      <header>
        <h3>
          <CalendarClock aria-hidden="true" />
          Revisao de envio
        </h3>
        <button
          className="crm-action crm-action-primary"
          disabled={!canLaunch}
          onClick={onLaunch}
          type="button"
        >
          {isSaving ? "Agendando" : "Criar campanha"}
        </button>
      </header>

      <dl className="crm-whatsapp-campaign-review">
        <ReviewStat label="Incluidos" value={summary.included} />
        <ReviewStat label="Validos" value={selectedCount} />
        <ReviewStat label="Bloqueados" value={summary.blockedIncluded} />
        <ReviewStat
          label="Duracao"
          value={`${Math.max(0, selectedCount - 1) * intervalMinutes} min`}
        />
      </dl>

      <pre>{preview}</pre>
      <RecipientReviewTable
        onNameChange={onNameChange}
        onToggleRow={onToggleRow}
        rows={rows}
      />

      {localError ? (
        <p className="crm-whatsapp-campaign-error">{localError}</p>
      ) : null}
      {summary.blockedIncluded ? (
        <p className="crm-whatsapp-campaign-error">
          Corrija ou remova destinatarios bloqueados antes de criar a campanha.
        </p>
      ) : null}
      {lastResult ? (
        <p className="crm-whatsapp-campaign-success">{lastResult}</p>
      ) : null}
    </section>
  );
}

function ReviewStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RecipientReviewTable({
  onNameChange,
  onToggleRow,
  rows,
}: {
  onNameChange: (rowId: string, value: string) => void;
  onToggleRow: (rowId: string) => void;
  rows: CampaignRecipientReviewRow[];
}) {
  if (!rows.length) {
    return (
      <div className="crm-whatsapp-campaign-review-empty">
        Selecione conversas ou cole uma lista CSV para revisar destinatarios.
      </div>
    );
  }
  return (
    <div className="crm-whatsapp-campaign-review-table">
      <div role="row">
        <span>Enviar</span>
        <span>Nome</span>
        <span>Telefone</span>
        <span>Origem</span>
        <span>Status</span>
      </div>
      {rows.map((row) => (
        <RecipientReviewRow
          key={row.id}
          onNameChange={onNameChange}
          onToggleRow={onToggleRow}
          row={row}
        />
      ))}
    </div>
  );
}

function RecipientReviewRow({
  onNameChange,
  onToggleRow,
  row,
}: {
  onNameChange: (rowId: string, value: string) => void;
  onToggleRow: (rowId: string) => void;
  row: CampaignRecipientReviewRow;
}) {
  const StatusIcon =
    row.status === "ready"
      ? CheckCircle2
      : row.status === "warning"
        ? AlertCircle
        : CircleSlash;
  return (
    <div
      className={`crm-whatsapp-campaign-review-row crm-whatsapp-campaign-review-row-${row.status}`}
      role="row"
    >
      <label aria-label={`Incluir ${row.name || row.rawPhone || row.id}`}>
        <input
          checked={row.included}
          onChange={() => onToggleRow(row.id)}
          type="checkbox"
        />
      </label>
      <input
        aria-label="Nome do destinatario"
        onChange={(event) => onNameChange(row.id, event.target.value)}
        placeholder="cliente"
        value={row.name}
      />
      <span>{row.phone || row.rawPhone || "sem telefone"}</span>
      <span>{row.source === "csv" ? "CSV" : "Conversa"}</span>
      <span>
        <StatusIcon aria-hidden="true" />
        {row.issues[0] ?? "Pronto"}
      </span>
    </div>
  );
}
