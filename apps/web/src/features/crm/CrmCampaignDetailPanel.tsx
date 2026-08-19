import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  MessageCircle,
  MessageSquare,
  Reply,
  Send,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { CampaignRecipientPreview } from "./CrmCampaignRecipientPreview";
import type { CrmCampaign, CrmCampaignDetail } from "./crmCampaignTypes";
import type { CrmConversationCycle, CrmTag } from "./crmConversationTypes";

export function CrmCampaignDetailPanel({
  detail,
  isLoading,
  conversationCycles,
  tags,
}: {
  detail: CrmCampaignDetail | null;
  isLoading: boolean;
  conversationCycles: CrmConversationCycle[];
  tags: CrmTag[];
}) {
  if (isLoading) {
    return (
      <section className="crm-campaign-panel crm-campaign-detail">
        <div className="crm-campaign-loading-state">
          <p>Carregando detalhes da campanha...</p>
        </div>
      </section>
    );
  }
  if (!detail) {
    return (
      <section className="crm-campaign-panel crm-campaign-detail">
        <div className="crm-campaign-empty-card">
          <span aria-hidden="true" className="crm-campaign-empty-icon">
            <Sparkles />
          </span>
          <p>Selecione uma campanha para ver metricas e destinatarios.</p>
        </div>
      </section>
    );
  }

  const { campaign, recipients } = detail;
  const progress = progressPercent(campaign);
  return (
    <section className="crm-campaign-panel crm-campaign-detail">
      <header className="crm-campaign-detail-header">
        <div className="crm-campaign-detail-title-group">
          <div className="crm-campaign-detail-title-row">
            <strong>{campaign.name}</strong>
            <span className={`crm-campaign-status-${campaign.status}`}>
              {campaignStatusLabel(campaign.status)}
            </span>
          </div>
          <small className="crm-campaign-detail-date">
            <Calendar aria-hidden="true" className="size-3.5" />
            {formatWindow(campaign)}
          </small>
        </div>
      </header>

      {/* Progress Card */}
      <div className="crm-campaign-progress-card">
        <div className="crm-campaign-progress-top">
          <span className="crm-campaign-progress-label">
            Progresso de disparo
          </span>
          <strong className="crm-campaign-progress-value">
            {progress}% processado
          </strong>
        </div>
        <div className="crm-campaign-progress">
          <span style={{ inlineSize: `${progress}%` }} />
        </div>
        <div className="crm-campaign-progress-breakdown">
          <span>
            {campaign.sentCount} de {campaign.totalRecipients} enviados
          </span>
          {campaign.failedCount > 0 ? (
            <span className="text-danger">
              {campaign.failedCount} com falha
            </span>
          ) : null}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="crm-campaign-detail-metrics">
        {detailMetrics(campaign).map((item) => (
          <div className="crm-campaign-detail-metric-card" key={item.label}>
            <div className="crm-campaign-detail-metric-top">
              <span>{item.label}</span>
              <item.icon
                aria-hidden="true"
                className="crm-campaign-detail-metric-icon"
              />
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {/* Message and Automation Cards Grid */}
      <div className="crm-campaign-detail-grid">
        <MessagePreview
          icon={MessageSquare}
          title="Mensagem inicial"
          value={campaign.content}
        />
        <MessagePreview
          icon={Reply}
          title="Follow-up"
          value={campaign.secondaryContent ?? "Sem follow-up configurado."}
        />
        <AutomationPreview campaign={campaign} tags={tags} />
      </div>

      {/* Recipient Preview */}
      <CampaignRecipientPreview
        conversationCycles={conversationCycles}
        recipients={recipients}
      />
    </section>
  );
}

function MessagePreview({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof MessageSquare;
  title: string;
  value: string;
}) {
  return (
    <article className="crm-campaign-message-preview-card">
      <div className="crm-campaign-message-preview-header">
        <Icon aria-hidden="true" className="size-3.5 text-muted" />
        <h4>{title}</h4>
      </div>
      <div className="crm-campaign-message-bubble">
        <p>{value}</p>
      </div>
    </article>
  );
}

function AutomationPreview({
  campaign,
  tags,
}: {
  campaign: CrmCampaign;
  tags: CrmTag[];
}) {
  const initialTag = findTag(tags, campaign.initialTagId);
  const replyTag = findTag(tags, campaign.replyTagId);

  return (
    <article className="crm-campaign-automation-card">
      <div className="crm-campaign-message-preview-header">
        <Tag aria-hidden="true" className="size-3.5 text-muted" />
        <h4>Etiquetas</h4>
      </div>
      <dl className="crm-campaign-automation-list">
        <div className="crm-campaign-automation-row">
          <dt>Inicial</dt>
          <dd>
            {initialTag ? (
              <span className="crm-tag-admin-pill">
                <span
                  aria-hidden="true"
                  className="crm-tag-dot"
                  style={{
                    backgroundColor: initialTag.color || "var(--color-primary)",
                  }}
                />
                {initialTag.emoji ? `${initialTag.emoji} ` : ""}
                {initialTag.name}
              </span>
            ) : (
              <span className="text-muted">Nenhuma</span>
            )}
          </dd>
        </div>
        <div className="crm-campaign-automation-row">
          <dt>Resposta</dt>
          <dd>
            {replyTag ? (
              <span className="crm-tag-admin-pill">
                <span
                  aria-hidden="true"
                  className="crm-tag-dot"
                  style={{
                    backgroundColor: replyTag.color || "var(--color-success)",
                  }}
                />
                {replyTag.emoji ? `${replyTag.emoji} ` : ""}
                {replyTag.name}
              </span>
            ) : (
              <span className="text-muted">Nenhuma</span>
            )}
          </dd>
        </div>
        <div className="crm-campaign-automation-row">
          <dt>Atraso</dt>
          <dd className="crm-campaign-delay-pill">
            <Clock aria-hidden="true" className="size-3" />
            {campaign.secondaryDelayMinutes} min
          </dd>
        </div>
      </dl>
    </article>
  );
}

function detailMetrics(campaign: CrmCampaign) {
  return [
    { icon: Clock, label: "Agendadas", value: campaign.scheduledCount },
    { icon: CheckCircle2, label: "Enviadas", value: campaign.sentCount },
    { icon: AlertCircle, label: "Falhas", value: campaign.failedCount },
    { icon: Reply, label: "Respostas", value: campaign.repliedCount },
    {
      icon: TrendingUp,
      label: "Taxa",
      value: `${Math.round(campaign.replyRate * 100)}%`,
    },
    { icon: Send, label: "Follow-ups", value: campaign.secondarySentCount },
  ];
}

function progressPercent(campaign: CrmCampaign) {
  if (!campaign.totalRecipients) return 0;
  return Math.round(
    ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) *
      100,
  );
}

function formatWindow(campaign: CrmCampaign) {
  const start = new Date(campaign.scheduledStartAt).toLocaleString("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
  const end = new Date(campaign.scheduledEndAt).toLocaleString("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
  return `${start} até ${end}`;
}

function findTag(tags: readonly CrmTag[], tagId: string | null) {
  if (!tagId) return null;
  return tags.find((tag) => tag.id === tagId) ?? null;
}

function campaignStatusLabel(status: CrmCampaign["status"]) {
  const labels = {
    cancelled: "Cancelada",
    completed: "Concluida",
    draft: "Rascunho",
    paused: "Pausada",
    scheduled: "Agendada",
  };
  return labels[status];
}
