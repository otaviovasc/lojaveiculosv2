import type { CrmWhatsappCampaign } from "./crmWhatsappCampaignTypes";

export function CampaignStats({
  campaigns,
}: {
  campaigns: CrmWhatsappCampaign[];
}) {
  return (
    <div className="crm-whatsapp-campaign-stats">
      {summarizeCampaigns(campaigns).map((item) => (
        <div key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
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
    <section className="crm-whatsapp-campaign-panel">
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

function summarizeCampaigns(campaigns: CrmWhatsappCampaign[]) {
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
    { label: "Campanhas", value: campaigns.length },
    { label: "Destinatarios", value: totals.recipients },
    { label: "Agendadas", value: totals.scheduled },
    { label: "Enviadas", value: totals.sent },
    { label: "Falhas", value: totals.failed },
    { label: "Resposta", value: replyRate },
  ];
}
