import { Pause, Play, X } from "lucide-react";
import type { CrmWhatsappCampaign } from "./crmWhatsappCampaignTypes";

export function CrmWhatsappCampaignList({
  campaigns,
  canManage,
  isLoading,
  onCancel,
  onPause,
  onResume,
  onSelect,
  selectedCampaignId,
}: {
  campaigns: CrmWhatsappCampaign[];
  canManage: boolean;
  isLoading: boolean;
  onCancel: (campaignId: string) => Promise<void>;
  onPause: (campaignId: string) => Promise<void>;
  onResume: (campaignId: string) => Promise<void>;
  onSelect: (campaignId: string) => void;
  selectedCampaignId: string | null;
}) {
  return (
    <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-list">
      <h3>Campanhas recentes</h3>
      {isLoading ? <p>Carregando campanhas...</p> : null}
      {!isLoading && !campaigns.length ? (
        <p>Nenhuma campanha criada ainda.</p>
      ) : null}
      {campaigns.map((campaign) => (
        <article
          className={
            selectedCampaignId === campaign.id
              ? "crm-whatsapp-campaign-list-selected"
              : ""
          }
          key={campaign.id}
        >
          <div className="crm-whatsapp-campaign-list-status">
            <span className={`crm-whatsapp-campaign-status-${campaign.status}`}>
              {statusLabel(campaign.status)}
            </span>
            <small>{formatCampaignWindow(campaign)}</small>
          </div>
          <button
            aria-pressed={selectedCampaignId === campaign.id}
            className="crm-whatsapp-campaign-list-main"
            onClick={() => onSelect(campaign.id)}
            type="button"
          >
            <span>
              <strong>{campaign.name}</strong>
              <small>{campaign.totalRecipients} destinatario(s)</small>
            </span>
            <em>{Math.round(campaign.replyRate * 100)}%</em>
          </button>
          <div className="crm-whatsapp-campaign-list-progress">
            <span style={{ inlineSize: `${progressPercent(campaign)}%` }} />
          </div>
          <dl>
            {metricItems(campaign).map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <footer>
            <button
              aria-label="Pausar campanha"
              disabled={!canManage || campaign.status !== "scheduled"}
              onClick={() => void onPause(campaign.id)}
              type="button"
            >
              <Pause aria-hidden="true" />
            </button>
            <button
              aria-label="Retomar campanha"
              disabled={!canManage || campaign.status !== "paused"}
              onClick={() => void onResume(campaign.id)}
              type="button"
            >
              <Play aria-hidden="true" />
            </button>
            <button
              aria-label="Cancelar campanha"
              disabled={!canManage || campaign.status === "cancelled"}
              onClick={() => void onCancel(campaign.id)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </footer>
        </article>
      ))}
    </section>
  );
}

function metricItems(campaign: CrmWhatsappCampaign) {
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

function statusLabel(status: CrmWhatsappCampaign["status"]) {
  const labels = {
    cancelled: "Cancelada",
    completed: "Concluida",
    draft: "Rascunho",
    paused: "Pausada",
    scheduled: "Agendada",
  };
  return labels[status];
}

function progressPercent(campaign: CrmWhatsappCampaign) {
  if (!campaign.totalRecipients) return 0;
  return Math.round(
    ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) *
      100,
  );
}

function formatCampaignWindow(campaign: CrmWhatsappCampaign) {
  const start = new Date(campaign.scheduledStartAt);
  if (Number.isNaN(start.getTime())) return "sem data";
  return start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
