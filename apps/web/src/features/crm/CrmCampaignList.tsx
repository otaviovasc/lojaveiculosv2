import { Calendar, Megaphone, Pause, Play, RotateCcw, X } from "lucide-react";
import type { CrmCampaign } from "./crmCampaignTypes";

export function CrmCampaignList({
  campaigns,
  canManage,
  error,
  isLoading,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onSelect,
  selectedCampaignId,
}: {
  campaigns: CrmCampaign[];
  canManage: boolean;
  error?: string | null;
  isLoading: boolean;
  onCancel: (campaignId: string) => Promise<void>;
  onPause: (campaignId: string) => Promise<void>;
  onResume: (campaignId: string) => Promise<void>;
  onRetry?: () => Promise<void>;
  onSelect: (campaignId: string) => void;
  selectedCampaignId: string | null;
}) {
  return (
    <section className="crm-campaign-panel crm-campaign-list">
      <div className="crm-campaign-list-header">
        <span aria-hidden="true" className="crm-campaign-list-header-icon">
          <Megaphone />
        </span>
        <div className="crm-campaign-list-header-text">
          <h3>Campanhas recentes</h3>
          <p>Selecione para inspecionar métricas e destinatários.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
          <CampaignCardSkeleton />
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="crm-campaign-error" role="alert">
          <p>{error}</p>
          {onRetry ? (
            <button
              className="crm-action crm-action-secondary"
              onClick={() => void onRetry()}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !error && !campaigns.length ? (
        <div className="crm-campaign-empty-card">
          <span aria-hidden="true" className="crm-campaign-empty-icon">
            <Megaphone />
          </span>
          <p className="crm-campaign-empty-title">
            Nenhuma campanha criada ainda.
          </p>
          <p className="crm-campaign-empty-description">
            Crie sua primeira campanha de mensagens para engajar clientes e
            acompanhar o retorno em tempo real.
          </p>
        </div>
      ) : null}

      <div className="crm-campaign-cards-scroll">
        {campaigns.map((campaign) => {
          const isSelected = selectedCampaignId === campaign.id;
          const progress = progressPercent(campaign);
          return (
            <article
              className={`crm-campaign-card ${
                isSelected ? "crm-campaign-list-selected" : ""
              }`}
              key={campaign.id}
            >
              <div className="crm-campaign-list-status">
                <span className={`crm-campaign-status-${campaign.status}`}>
                  {statusLabel(campaign.status)}
                </span>
                <small className="crm-campaign-date-pill">
                  <Calendar aria-hidden="true" className="size-3" />
                  {formatCampaignWindow(campaign)}
                </small>
              </div>

              <button
                aria-pressed={isSelected}
                className="crm-campaign-list-main"
                onClick={() => onSelect(campaign.id)}
                type="button"
              >
                <span>
                  <strong>{campaign.name}</strong>
                  <small>{campaign.totalRecipients} destinatario(s)</small>
                </span>
                <em>{Math.round(campaign.replyRate * 100)}%</em>
              </button>

              <div className="crm-campaign-list-progress">
                <span style={{ inlineSize: `${progress}%` }} />
              </div>

              <dl className="crm-campaign-metric-grid">
                {metricItems(campaign).map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>

              <footer className="crm-campaign-card-footer">
                <div className="crm-campaign-card-actions">
                  <button
                    aria-label="Pausar campanha"
                    className="crm-campaign-action-btn"
                    disabled={!canManage || campaign.status !== "scheduled"}
                    onClick={() => void onPause(campaign.id)}
                    title="Pausar campanha"
                    type="button"
                  >
                    <Pause aria-hidden="true" />
                  </button>
                  <button
                    aria-label="Retomar campanha"
                    className="crm-campaign-action-btn"
                    disabled={!canManage || campaign.status !== "paused"}
                    onClick={() => void onResume(campaign.id)}
                    title="Retomar campanha"
                    type="button"
                  >
                    <Play aria-hidden="true" />
                  </button>
                  <button
                    aria-label="Cancelar campanha"
                    className="crm-campaign-action-btn crm-campaign-cancel-btn"
                    disabled={!canManage || campaign.status === "cancelled"}
                    onClick={() => void onCancel(campaign.id)}
                    title="Cancelar campanha"
                    type="button"
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function metricItems(campaign: CrmCampaign) {
  return [
    { label: "Destinatarios", value: campaign.totalRecipients },
    { label: "Agendadas", value: campaign.scheduledCount },
    { label: "Enviadas", value: campaign.sentCount },
    { label: "Falhas", value: campaign.failedCount },
    { label: "Respostas", value: campaign.repliedCount },
    { label: "Taxa", value: `${Math.round(campaign.replyRate * 100)}%` },
    { label: "Follow-up", value: campaign.secondarySentCount },
  ];
}

function statusLabel(status: CrmCampaign["status"]) {
  const labels = {
    cancelled: "Cancelada",
    completed: "Concluida",
    draft: "Rascunho",
    paused: "Pausada",
    scheduled: "Agendada",
  };
  return labels[status];
}

function progressPercent(campaign: CrmCampaign) {
  if (!campaign.totalRecipients) return 0;
  return Math.round(
    ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) *
      100,
  );
}

function formatCampaignWindow(campaign: CrmCampaign) {
  const start = new Date(campaign.scheduledStartAt);
  if (Number.isNaN(start.getTime())) return "sem data";
  return start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function CampaignCardSkeleton() {
  return (
    <div className="crm-campaign-skeleton-card p-4 rounded-xl border border-line bg-app flex flex-col gap-2.5">
      <div className="flex justify-between items-center">
        <div className="crm-skeleton h-5 w-24 rounded-md" />
        <div className="crm-skeleton h-4 w-32 rounded-md" />
      </div>
      <div className="crm-skeleton h-5 w-48 rounded-md" />
      <div className="crm-skeleton h-4 w-28 rounded-md" />
    </div>
  );
}
