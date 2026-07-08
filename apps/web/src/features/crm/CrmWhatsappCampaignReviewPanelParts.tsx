import { AlertCircle, CheckCircle2, CircleSlash } from "lucide-react";
import type { CampaignRecipientReviewRow } from "./CrmWhatsappCampaignRecipientReview";

export function ReviewStat({
  active = false,
  label,
  onClick,
  value,
}: {
  active?: boolean;
  label: string;
  onClick?: () => void;
  value: number | string;
}) {
  if (!onClick) {
    return (
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    );
  }
  return (
    <div className={active ? "crm-whatsapp-campaign-review-stat-active" : ""}>
      <dt>{label}</dt>
      <dd>
        <button aria-label={`Filtrar ${label}`} onClick={onClick} type="button">
          {value}
        </button>
      </dd>
    </div>
  );
}

export function RecipientReviewTable({
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
