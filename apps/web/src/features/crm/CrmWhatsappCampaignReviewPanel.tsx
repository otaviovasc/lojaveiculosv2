import { CalendarClock, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  CampaignRecipientReviewRow,
  CampaignRecipientReviewSummary,
} from "./CrmWhatsappCampaignRecipientReview";
import {
  RecipientReviewTable,
  ReviewStat,
} from "./CrmWhatsappCampaignReviewPanelParts";

type ReviewFilter = "all" | "blocked" | "ready" | "warning";

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
  showLaunchAction = true,
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
  showLaunchAction?: boolean;
  summary: CampaignRecipientReviewSummary;
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesFilter = filter === "all" || row.status === filter;
        const haystack = [
          row.name,
          row.phone,
          row.rawPhone,
          row.source,
          ...row.issues,
        ]
          .join(" ")
          .toLowerCase();
        return (
          matchesFilter &&
          (!query.trim() || haystack.includes(query.trim().toLowerCase()))
        );
      }),
    [filter, query, rows],
  );

  return (
    <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-review-panel">
      <header>
        <h3>
          <CalendarClock aria-hidden="true" />
          Revisao de envio
        </h3>
        {showLaunchAction ? (
          <button
            className="crm-action crm-action-primary"
            disabled={!canLaunch}
            onClick={onLaunch}
            type="button"
          >
            {isSaving ? "Agendando" : "Criar campanha"}
          </button>
        ) : null}
      </header>

      <dl className="crm-whatsapp-campaign-review">
        <ReviewStat
          active={filter === "all"}
          label="Incluidos"
          onClick={() => setFilter("all")}
          value={summary.included}
        />
        <ReviewStat
          active={filter === "ready"}
          label="Validos"
          onClick={() => setFilter("ready")}
          value={selectedCount}
        />
        <ReviewStat
          active={filter === "blocked"}
          label="Bloqueados"
          onClick={() => setFilter("blocked")}
          value={summary.blockedIncluded}
        />
        <ReviewStat
          active={filter === "warning"}
          label="Atenção"
          onClick={() => setFilter("warning")}
          value={summary.warnings}
        />
        <ReviewStat
          label="Duracao"
          value={`${Math.max(0, selectedCount - 1) * intervalMinutes} min`}
        />
      </dl>

      <pre>{preview}</pre>
      <div className="crm-whatsapp-campaign-review-tools">
        <div className="crm-whatsapp-campaign-search">
          <Search aria-hidden="true" />
          <input
            aria-label="Buscar destinatario em revisao"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar telefone, nome ou erro"
            value={query}
          />
        </div>
        <span>
          <Filter aria-hidden="true" />
          {filteredRows.length} de {rows.length}
        </span>
      </div>
      <RecipientReviewTable
        onNameChange={onNameChange}
        onToggleRow={onToggleRow}
        rows={filteredRows}
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
