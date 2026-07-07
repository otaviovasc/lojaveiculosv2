import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
  Reply,
  Tag,
} from "lucide-react";
import { CampaignRecipientPreview } from "./CrmWhatsappCampaignRecipientPreview";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignDetail,
} from "./crmWhatsappCampaignTypes";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";

export function CrmWhatsappCampaignDetailPanel({
  detail,
  isLoading,
  sessions,
  tags,
}: {
  detail: CrmWhatsappCampaignDetail | null;
  isLoading: boolean;
  sessions: CrmWhatsappSession[];
  tags: CrmWhatsappTag[];
}) {
  if (isLoading) {
    return (
      <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-detail">
        <p>Carregando detalhes da campanha...</p>
      </section>
    );
  }
  if (!detail) {
    return (
      <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-detail">
        <p>Selecione uma campanha para ver metricas e destinatarios.</p>
      </section>
    );
  }

  const { campaign, recipients } = detail;
  const progress = progressPercent(campaign);
  return (
    <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-detail">
      <header>
        <div>
          <strong>{campaign.name}</strong>
          <span>{campaignStatusLabel(campaign.status)}</span>
        </div>
        <small>{formatWindow(campaign)}</small>
      </header>

      <div className="crm-whatsapp-campaign-progress">
        <span style={{ inlineSize: `${progress}%` }} />
      </div>

      <div className="crm-whatsapp-campaign-detail-metrics">
        {detailMetrics(campaign).map((item) => (
          <div key={item.label}>
            <item.icon aria-hidden="true" />
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="crm-whatsapp-campaign-detail-grid">
        <MessagePreview title="Mensagem inicial" value={campaign.content} />
        <MessagePreview
          title="Follow-up"
          value={campaign.secondaryContent ?? "Sem follow-up configurado."}
        />
        <AutomationPreview campaign={campaign} tags={tags} />
      </div>

      <CampaignRecipientPreview recipients={recipients} sessions={sessions} />
    </section>
  );
}

function MessagePreview({ title, value }: { title: string; value: string }) {
  return (
    <article>
      <h4>{title}</h4>
      <p>{value}</p>
    </article>
  );
}

function AutomationPreview({
  campaign,
  tags,
}: {
  campaign: CrmWhatsappCampaign;
  tags: CrmWhatsappTag[];
}) {
  return (
    <article>
      <h4>
        <Tag aria-hidden="true" />
        Etiquetas
      </h4>
      <dl>
        <div>
          <dt>Inicial</dt>
          <dd>{tagName(tags, campaign.initialTagId)}</dd>
        </div>
        <div>
          <dt>Resposta</dt>
          <dd>{tagName(tags, campaign.replyTagId)}</dd>
        </div>
        <div>
          <dt>Atraso</dt>
          <dd>{campaign.secondaryDelayMinutes} min</dd>
        </div>
      </dl>
    </article>
  );
}

function detailMetrics(campaign: CrmWhatsappCampaign) {
  return [
    { icon: Clock, label: "Agendadas", value: campaign.scheduledCount },
    { icon: CheckCircle2, label: "Enviadas", value: campaign.sentCount },
    { icon: AlertCircle, label: "Falhas", value: campaign.failedCount },
    { icon: Reply, label: "Respostas", value: campaign.repliedCount },
    {
      icon: MessageCircle,
      label: "Taxa",
      value: `${Math.round(campaign.replyRate * 100)}%`,
    },
    { icon: Reply, label: "Follow-ups", value: campaign.secondarySentCount },
  ];
}

function progressPercent(campaign: CrmWhatsappCampaign) {
  if (!campaign.totalRecipients) return 0;
  return Math.round(
    ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) *
      100,
  );
}

function formatWindow(campaign: CrmWhatsappCampaign) {
  const start = new Date(campaign.scheduledStartAt).toLocaleString("pt-BR");
  const end = new Date(campaign.scheduledEndAt).toLocaleString("pt-BR");
  return `${start} ate ${end}`;
}

function tagName(tags: readonly CrmWhatsappTag[], tagId: string | null) {
  if (!tagId) return "Nenhuma";
  return tags.find((tag) => tag.id === tagId)?.name ?? "Etiqueta removida";
}

function campaignStatusLabel(status: CrmWhatsappCampaign["status"]) {
  return {
    cancelled: "Cancelada",
    completed: "Concluida",
    draft: "Rascunho",
    paused: "Pausada",
    scheduled: "Agendada",
  }[status];
}
