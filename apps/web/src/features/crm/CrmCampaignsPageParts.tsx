import {
  AlertCircle,
  Clock,
  Megaphone,
  MessageSquareReply,
  Send,
  Users,
} from "lucide-react";
import type { CrmCampaign } from "./crmCampaignTypes";

export function CampaignStats({ campaigns }: { campaigns: CrmCampaign[] }) {
  return (
    <div className="crm-campaign-stats">
      {summarizeCampaigns(campaigns).map((item) => {
        const Icon = item.icon;
        return (
          <div className="crm-campaign-stat-card" key={item.label}>
            <div className="crm-campaign-stat-top">
              <span>{item.label}</span>
              <Icon aria-hidden="true" className="crm-campaign-stat-icon" />
            </div>
            <strong>{item.value}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function CampaignMessagePanel({
  canCreate,
  campaignName,
  isSaving,
  onCampaignNameChange,
  onTextChange,
  text,
}: {
  canCreate: boolean;
  campaignName: string;
  isSaving: boolean;
  onCampaignNameChange: (value: string) => void;
  onTextChange: (value: string) => void;
  text: string;
}) {
  return (
    <section className="crm-campaign-panel">
      <h3>Mensagem e ritmo</h3>
      <label>
        Nome da campanha
        <input
          disabled={!canCreate || isSaving}
          maxLength={191}
          onChange={(event) => onCampaignNameChange(event.target.value)}
          value={campaignName}
        />
      </label>
      <label>
        Mensagem inicial
        <textarea
          disabled={!canCreate || isSaving}
          maxLength={4000}
          onChange={(event) => onTextChange(event.target.value)}
          rows={7}
          value={text}
        />
      </label>
      <p>
        Variavel disponivel: <code>{"{nome}"}</code>. Ela usa o nome da conversa
        ou "cliente" quando estiver vazio.
      </p>
    </section>
  );
}

function summarizeCampaigns(campaigns: CrmCampaign[]) {
  const totals = campaigns.reduce(
    (acc, campaign) => ({
      failed: acc.failed + campaign.failedCount,
      recipients: acc.recipients + campaign.totalRecipients,
      replied: acc.replied + campaign.repliedCount,
      scheduled: acc.scheduled + campaign.scheduledCount,
      sent: acc.sent + campaign.sentCount,
    }),
    { failed: 0, recipients: 0, replied: 0, scheduled: 0, sent: 0 },
  );
  const replyRate =
    totals.sent > 0
      ? `${Math.round((totals.replied / totals.sent) * 100)}%`
      : "0%";
  return [
    { icon: Megaphone, label: "Campanhas", value: campaigns.length },
    { icon: Users, label: "Destinatarios", value: totals.recipients },
    { icon: Clock, label: "Agendadas", value: totals.scheduled },
    { icon: Send, label: "Enviadas", value: totals.sent },
    { icon: AlertCircle, label: "Falhas", value: totals.failed },
    { icon: MessageSquareReply, label: "Resposta", value: replyRate },
  ];
}
